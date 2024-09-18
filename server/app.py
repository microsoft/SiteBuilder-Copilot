from flask import Flask, request, jsonify, send_from_directory, url_for
from mimetypes import guess_type
from flask_cors import CORS
import os
from agent_factory import AgentFactory
import requests
import shutil
import asyncio

app = Flask(__name__)
CORS(app)

agent_factory = AgentFactory()

def get_session_directory(session_id):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(current_dir, 'jobs', session_id)

@app.route('/sendprompt/<sessionId>', methods=['POST'])
async def send_prompt(sessionId):
    if 'prompt' not in request.form:
        return jsonify({"error": "No prompt provided"}), 400

    prompt = request.form['prompt']
    file = request.files.get('file')
    file_content = None

    session_dir = get_session_directory(sessionId)
    deprecate_index_template(sessionId)
    if not os.path.exists(session_dir):
        os.makedirs(session_dir)

    agents = agent_factory.get_or_create_agents(sessionId)
    orchestrator_agent = agents["orchestrator_agent"]
    template_agent = agents["template_agent"]

    try:
        if file:
            file_content = saveAttachment(file, sessionId)

        plaintext_response = orchestrator_agent.send_prompt(prompt, file_content)
        asyncio.create_task(asyncio.to_thread(process_template, prompt, file_content, sessionId, template_agent))
        orchestrator_agent.save(os.path.join(session_dir, 'agents', 'orchestrator_agent.json'))

        return jsonify({
            "response": plaintext_response,
        }), 200
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

def deprecate_index_template(sessionId):
    template_dir = os.path.join(get_session_directory(sessionId), 'template')
    os.makedirs(template_dir, exist_ok=True)
    index_path = os.path.join(template_dir, 'index.html')
    deprecated_path = os.path.join(template_dir, 'index.html.old')
    
    if os.path.exists(index_path):
        if os.path.exists(deprecated_path):
            os.remove(deprecated_path)
        os.rename(index_path, deprecated_path)


@app.route('/getoutput/<sessionId>', methods=['POST'])
async def get_output(sessionId):
    html_content = None
    session_dir = get_session_directory(sessionId)
    template_path = os.path.join(session_dir, 'template', 'index.html')

    if os.path.exists(template_path):
        with open(template_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        template_url = url_for('serve_html_template', session_id=sessionId, filename='index.html', _external=True)
    else:
        # If the template does not exist yet, return a not ready status
        return jsonify({"status": "not ready"}), 200

    return jsonify({
            "status": "ready",
            "htmldata": html_content,
            "templateurl": template_url
        }), 200
    
import traceback

def saveAttachment(file, session_id):
    upload_dir = os.path.join(get_session_directory(session_id), 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    file.save(file_path)
    
    with open(file_path, 'rb') as f:
        file_content = f.read()
    
    return file_content

def save_template(html_content, session_id):
    template_dir = os.path.join(get_session_directory(session_id), 'template')
    os.makedirs(template_dir, exist_ok=True)
    file_path = os.path.join(template_dir, 'index.html')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    img_dir = os.path.join(template_dir, 'img')
    os.makedirs(img_dir, exist_ok=True)
    placeholder_src = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'placeholder.jpg')
    print(f"Debug: placeholder_src={placeholder_src}")
    placeholder_dst = os.path.join(img_dir, 'placeholder.jpg')
    print(f"Debug: placeholder_dst={placeholder_dst}")
    shutil.copy(placeholder_src, placeholder_dst)

    return 'index.html'

def update_text(text, session_id):
    # Remove target tokens
    text = text.replace("```html", "")
    text = text.replace("```", "")
    
    # Replace placeholder path with the new path
    new_path = f' http://127.0.0.1:5000/jobs/{session_id}/template/img/placeholder.jpg'
    text = text.replace("/temp_path/placeholder.jpg", new_path)
    
    return text

def process_template(prompt, file_content, sessionId, template_agent):
    print(f"Debug: Entered process_template with prompt={prompt}, sessionId={sessionId}")
    
    html_response = template_agent.send_prompt(prompt, file_content)
    print(f"Debug: Received html_response from send_prompt")

    session_dir = get_session_directory(sessionId)
    print(f"Debug: session_dir={session_dir}")

    template_agent.save(os.path.join(session_dir, 'agents', 'template_agent.json'))
    print(f"Debug: Saved template_agent to {os.path.join(session_dir, 'agents', 'template_agent.json')}")

    try:
        html_response = update_text(html_response, sessionId)
        print(f"Debug: html_response after replace_placeholder_image_path")
    except Exception as e:
        print(f"Error: Exception occurred in update_text: {e}")
        traceback.print_exc()

    save_template(html_response, sessionId)
    print(f"Debug: Saved template with sessionId={sessionId}")
    
@app.route("/jobs/<session_id>/<filename>", methods=["GET"])
def serve_html_template(session_id, filename):
    asset_dir = os.path.join(get_session_directory(session_id), 'template')
    asset_path = os.path.join(asset_dir, filename)
    
    if not os.path.exists(asset_path):
        return jsonify({"error": ""}), 404

    return send_from_directory(asset_dir, filename, as_attachment=False, mimetype=guess_type(filename)[0])

@app.route('/jobs/<sessionid>/template/img/<filename>')
def serve_image(sessionid, filename):
    directory = os.path.join(get_session_directory(sessionid), 'template', 'img')
    return send_from_directory(directory, filename)

if __name__ == '__main__':
    app.run(debug=True)

@app.route('/getimage/<session_id>', methods=['POST'])
def get_image(session_id):
    if 'prompt' not in request.form:
        return jsonify({"error": "No prompt provided"}), 400

    raw_image_prompt = request.form['prompt']
    
    try:
        image_prompt = f"""Please generate an image that encapsulates the vibe of the following prompt:

        {raw_image_prompt}
        """
        agents = agent_factory.get_or_create_agents(session_id)
        image_gen_agent = agents["image_gen_agent"]

        # Get the image URL from the LLM client
        image_url = image_gen_agent.generate_image(image_prompt)

        # Download the image
        try:
            response = requests.get(image_url)
            response.raise_for_status()  # Check if the request was successful
            image_dir = os.path.join(get_session_directory(session_id), 'images')
            file_path = os.path.join(image_dir, "background.png")
            with open(file_path, "wb") as file:
                file.write(response.content)
            print("Image saved as background.png")
        except Exception as e:
            print(f"An error occurred while downloading the image: {e}")

        return jsonify({'image': image_url}), 200
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500

@app.route('/messages/<sessionId>', methods=['GET'])
def get_messages(sessionId):
    try:
        agents = agent_factory.get_or_create_agents(sessionId)
        orchestrator_agent = agents["orchestrator_agent"]
        
        return jsonify({'messages': orchestrator_agent.get_messages()}), 200
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500        

    
@app.route('/newchat/<sessionId>', methods=['POST'])
def new_chat(sessionId):
    try:
        agents = agent_factory.get_or_create_agents(sessionId)
        orchestrator_agent = agents["orchestrator_agent"]
        template_agent = agents["template_agent"]        
        
        # Initialize a new chat session
        orchestrator_agent.reset()
        template_agent.reset()

        return jsonify({'message': 'New chat session initialized'}), 200
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500

@app.route('/sessionhistory', methods=['GET'])
def get_session_history():
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        jobs_dir = os.path.join(current_dir, 'jobs')
        return jsonify([d for d in os.listdir(jobs_dir) if os.path.isdir(os.path.join(jobs_dir, d))])
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)