from flask import Flask, request, jsonify
from flask_cors import CORS
from agent_instances import AgentInstances
import threading
import uuid

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

jobs = {}

@app.route('/promptAsync', methods=['POST'])
def prompt_async():
    data = request.get_json()
    if 'prompt' not in data:
        return jsonify({"error": "No prompt provided"}), 400

    prompt = data['prompt']
    try:
        # Generate initial orchestrator response
        orchestrator_prompt = f"""Please play the role of an AI orchestrator for a website generator and respond to some user input.
        It should be no more than a paragraph or 200 characters long and only in plaintext.

        Here is the user input you need to provide a response for:

        {prompt}"""

        plaintext_response = generate_plaintext_response(orchestrator_prompt)

        # Create a unique job ID
        job_id = str(uuid.uuid4())

        # Store the job status
        jobs[job_id] = {
            'status': 'processing',
            'result': None
        }

        # Start background processing
        threading.Thread(target=process_job, args=(job_id, prompt)).start()

        return jsonify({
            "plaintextdata": plaintext_response,
            "job_id": job_id
        }), 200
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@app.route('/getResultAsync', methods=['POST'])
def get_result_async():
    data = request.get_json()
    job_id = data.get('job_id')
    if not job_id or job_id not in jobs:
        return jsonify({"error": "Invalid or missing job ID"}), 400

    job = jobs[job_id]

    if job['status'] == 'completed':
        return jsonify({
            "status": "completed",
            "plaintextdata": job['result']['plaintextdata'],
            "htmldata": job['result']['htmldata']
        }), 200
    else:
        return jsonify({"status": job['status']}), 200

def process_job(job_id, prompt):
    try:
        # Analyzer agent produces a JSON schema
        analyzer_prompt = f"""Analyze the following user prompt and produce a JSON schema describing the website specifications:

        {prompt}

        Provide the JSON schema only."""
        schema_response = AgentInstances.analyzer.send_prompt(analyzer_prompt)

        # Planner agent plans tasks based on the analysis
        planner_prompt = f"""Given the following JSON schema:

        {schema_response}

        Plan the tasks needed to generate the website, including template generation, scripting, and styling. Provide the plan in JSON format."""
        plan_response = AgentInstances.planner.send_prompt(planner_prompt)

        template_prompt = f"""Based on the following plan:

        {plan_response}

        Generate the HTML template for the website."""
        template_response = AgentInstances.template.send_prompt(template_prompt)

        # Scripting agent generates JavaScript code
        scripting_prompt = f"""Based on the following plan:

        {plan_response}

        Generate the JavaScript code needed for the website."""
        scripting_response = AgentInstances.scripting.send_prompt(scripting_prompt)

        # Styling agent generates CSS
        styling_prompt = f"""Based on the following plan:

        {plan_response}

        Generate the CSS styling for the website."""
        styling_response = AgentInstances.styling.send_prompt(styling_prompt)

        # Validator agent checks the outputs
        validator_prompt = f"""Validate the following website components and suggest any revisions if necessary:

        HTML Template:
        {template_response}

        JavaScript Code:
        {scripting_response}

        CSS Styling:
        {styling_response}

        Provide feedback or confirm completion."""
        validator_response = AgentInstances.validator.send_prompt(validator_prompt)

        # Check if revisions are required
        if "revise" in validator_response.lower():
            # For simplicity, assume revisions are made
            # In a real scenario, you might loop back to agents for revisions
            pass

        # Combine all parts into final HTML
        final_html = f"""
        <!-- Combined HTML -->
        {template_response}

        <!-- Embedded JavaScript -->
        <script>
        {scripting_response}
        </script>

        <!-- Embedded CSS -->
        <style>
        {styling_response}
        </style>
        """

        # Update job status and result
        jobs[job_id]['status'] = 'completed'
        jobs[job_id]['result'] = {
            'plaintextdata': 'Your website has been generated successfully!',
            'htmldata': final_html
        }
    except Exception as e:
        print(e)
        jobs[job_id]['status'] = 'failed'

@app.route('/sendprompt', methods=['POST'])
def send_prompt():
    data = request.get_json()
    if 'prompt' not in data:
        return jsonify({"error": "No prompt provided"}), 400

    prompt = data['prompt']
    try:
        # TODO: Parallelize these prompts
        orchestrator_prompt = f"""Please play the role of an AI orchestrator for a website generator and respond to some user input.
It should be no more than a paragraph or 200 characters long and only in plaintext.

Here is the user input you need to provide a response for:

{prompt}"""

        plaintext_response = generate_plaintext_response(orchestrator_prompt)

        html_prompt = f"""Please generate an HTML/CSS/JavaScript template for a website based on the following prompt:

{prompt}

The HTML content should be wrapped with delimiters --TMP START-- and --TMP END--.
"""

        html_response = AgentInstances.template.send_prompt(html_prompt)
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
        image_response = AgentInstances.image_gen.get_base64_image(image_prompt)
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
        image_url = AgentInstances.image_gen.generate_image(image_prompt)

        return jsonify({'image': image_url}), 200
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500

def generate_plaintext_response(orchestrator_prompt):
    plaintext_response = AgentInstances.orchestrator.send_prompt(orchestrator_prompt)
    return plaintext_response

def extract_html(response):
    """
    Extracts template content from the given response string.

    Args:
    response (str): The response string containing template content between --TMP START-- and --TMP END--.

    Returns:
    str: The extracted template content or an empty string if the markers are not found.
    """
    start_marker = "--TMP START--"
    end_marker = "--TMP END--"

    start_index = response.find(start_marker)
    end_index = response.find(end_marker)

    if (start_index == -1) or (end_index == -1):
        return ""

    # Adjust indices to extract content between the markers
    start_index += len(start_marker)

    return response[start_index:end_index].strip()

if __name__ == '__main__':
    app.run(debug=True)