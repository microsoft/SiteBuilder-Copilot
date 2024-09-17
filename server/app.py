from flask import Flask, request, jsonify, send_from_directory, url_for
from mimetypes import guess_type
from flask_cors import CORS
import os
from agent_factory import AgentFactory

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize the AgentFactory
agent_factory = AgentFactory()

@app.route('/sendprompt/<sessionId>', methods=['POST'])
def send_prompt(sessionId):
    if 'prompt' not in request.form:
        return jsonify({"error": "No prompt provided"}), 400

    prompt = request.form['prompt']
    file = request.files.get('file')
    file_content = None

    # Ensure the jobs directory exists
    jobs_dir = os.path.join('jobs')
    if not os.path.exists(jobs_dir):
        os.makedirs(jobs_dir)

    # Ensure the session directory exists
    session_dir = os.path.join(jobs_dir, sessionId)
    if not os.path.exists(session_dir):
        os.makedirs(session_dir)

    agents = agent_factory.get_or_create_agents(sessionId)
    orchestrator_agent = agents["orchestrator_agent"]
    template_agent = agents["template_agent"]

    try:
        if file:
            file_content = saveAttachment(file, sessionId)
                
        #TODO: Parallelize these prompts
        orchestrator_prompt = f"""Please play the role of an AI orchestrator for a website generator and respond to some user input.
        It should be no more than a paragraph or 200 characters long and only in plaintext.
        
        Here is the user input you need to provide a response for:
        
        {prompt}"""
        
        plaintext_response = orchestrator_agent.send_prompt(orchestrator_prompt, file_content)

        html_prompt = f"""Please generate a html/css/javacript template for a website based on the following prompt:
        
        {prompt}
        
        The HTML content should be wrapped with delimiters +START+ and +END+.
        """
        html_response = template_agent.send_prompt(html_prompt, file_content)
        html_response = extract_html(html_response)

        template_filename = saveTemplate(html_response, sessionId)
        template_url = url_for('serve_html_template', session_id=sessionId, filename=template_filename, _external=True)

        return jsonify({
            "plaintextdata": plaintext_response,
            "htmldata": html_response,
            "templateurl": template_url
        }), 200
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500
    
@app.route("/jobs/<session_id>/<filename>", methods=["GET"])
def serve_html_template(session_id, filename):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    asset_dir = os.path.join(current_dir, 'jobs', session_id, 'template')
    asset_path = os.path.join(asset_dir, filename)
    
    if not os.path.exists(asset_path):
        return jsonify({"error": ""}), 404

    return send_from_directory(asset_dir, filename, as_attachment=False, mimetype=guess_type(filename)[0])

@app.route('/getbase64image', methods=['POST'])
def get_base64_image():
    try:
        data = request.get_json()
        image_prompt = data.get('image_prompt')
        if not image_prompt:
            return jsonify({'error': 'No prompt provided'}), 400

        session_id = data.get('session_id')
        if not session_id:
            return jsonify({'error': 'No session ID provided'}), 400

        agents = agent_factory.get_or_create_agents(session_id)
        image_gen_agent = agents["image_gen_agent"]
  
        # Get the base64 encoded image from the LLM client
        image_response = image_gen_agent.get_base64_image(image_prompt)
        image_base64 = f"data:image/png;base64,{image_response}"

        return jsonify({'image': image_base64}), 200
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500

@app.route('/getimage', methods=['POST'])
def get_image():
    try:
        data = request.get_json()
        image_prompt = data.get('image_prompt')
        if not image_prompt:
            return jsonify({'error': 'No prompt provided'}), 400

        session_id = data.get('session_id')
        if not session_id:
            return jsonify({'error': 'No session ID provided'}), 400

        agents = agent_factory.get_or_create_agents(session_id)
        image_gen_agent = agents["image_gen_agent"]
  
        # Get the image URL from the LLM client
        image_url = image_gen_agent.generate_image(image_prompt)

        return jsonify({'image': image_url}), 200
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

def saveAttachment(file, session_id):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    upload_dir = os.path.join(current_dir, 'jobs', session_id, 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)
    file.save(file_path)
    
    with open(file_path, 'rb') as f:
        file_content = f.read()
    
    return file_content

def saveTemplate(html_content, session_id):
    """
    Saves the HTML content to an index.html file in the session's directory.
    
    Args:
    html_content (str): The HTML content to save.
    session_id (str): The session ID to determine the directory.
    
    Returns:
    str: The filename of the saved index.html file.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    template_dir = os.path.join(current_dir, 'jobs', session_id, 'template')
    os.makedirs(template_dir, exist_ok=True)
    file_path = os.path.join(template_dir, 'index.html')
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    return 'index.html'

def extract_html(response):
    """
    Extracts template content from the given response string.
    
    Args:
    response (str): The response string containing template content between +START+ and +END+.
    
    Returns:
    str: The extracted template content or an empty string if the markers are not found.
    """
    start_marker = "+START+"
    end_marker = "+END+"
    
    start_index = response.find(start_marker)
    end_index = response.find(end_marker)
    
    if (start_index == -1) or (end_index == -1):
        return ""
    
    # Adjust indices to extract content between the markers
    start_index += len(start_marker)
    
    return response[start_index:end_index].strip()

if __name__ == '__main__':
    app.run(debug=True)