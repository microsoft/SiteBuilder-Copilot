from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from agents import AzureOpenAIAgent
from agents import DallEAgent

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
api_key = os.getenv("AZURE_OPENAI_API_KEY")  # Ensure your API key is set in the environment variables
base_url = os.getenv("AZURE_OPENAI_ENDPOINT")
api_version = "2024-02-01"

agent = AzureOpenAIAgent(
    api_key=api_key,
    api_version=api_version,
    base_url=base_url,
    model="gpt4o",
    system_message="You are a knowledgeable assistant."
)

image_resource_url = os.getenv("AZURE_OPENAI_DALLE_ENDPOINT")
image_api_key = os.getenv("AZURE_OPENAI_DALLE_KEY")
image_gen_agent = DallEAgent(api_key=image_api_key, api_version=api_version, base_url=image_resource_url, model="dall-e-3")

@app.route('/sendprompt', methods=['POST'])
def send_prompt():
    data = request.get_json()
    if 'prompt' not in data:
        return jsonify({"error": "No prompt provided"}), 400

    prompt = data['prompt']
    try:
        #TODO: Parallelize these prompts
        orchestrator_prompt = f"""Please play the role of an AI orchestrator for a website generator and respond to some user input.
        It should be no more than a paragraph or 200 characters long and only in plaintext.
        
        Here is the user input you need to provide a response for:
        
        {prompt}"""
        
        plaintext_response = generate_plaintext_response(orchestrator_prompt)


        html_prompt = f"""Please generate HTML content for a website based on the following prompt:
        
        {prompt}
        
        The HTML content should be wrapped with delimiters --HTML START-- and --HTML END--.
        """
        html_response = agent.send_prompt(html_prompt)
        html_response = extract_html(html_response)

        return jsonify({
            "plaintextdata": plaintext_response,
            "htmldata": html_response,
        }), 200
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@app.route('/getbase64image', methods=['POST'])
def get_base64_image():
    try:
        data = request.get_json()
        image_prompt = data.get('image_prompt')
        if not image_prompt:
            return jsonify({'error': 'No prompt provided'}), 400
  
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
  
        # Get the image URL from the LLM client
        image_url = image_gen_agent.generate_image(image_prompt)

        return jsonify({'image': image_url}), 200
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500
    
def generate_plaintext_response(orchestrator_prompt):
    plaintext_response = agent.send_prompt(orchestrator_prompt)
    return plaintext_response

def generate_image_prompt(image_prompt):
    image_response = agent.send_prompt(image_prompt)
    return image_response

def extract_html(response):
    """
    Extracts HTML content from the given response string.
    
    Args:
    response (str): The response string containing HTML content between --HTML START-- and --HTML END--.
    
    Returns:
    str: The extracted HTML content or an empty string if the markers are not found.
    """
    start_marker = "--HTML START--"
    end_marker = "--HTML END--"
    
    start_index = response.find(start_marker)
    end_index = response.find(end_marker)
    
    if (start_index == -1) or (end_index == -1):
        return ""
    
    # Adjust indices to extract content between the markers
    start_index += len(start_marker)
    
    return response[start_index:end_index].strip()

if __name__ == '__main__':
    app.run(debug=True)