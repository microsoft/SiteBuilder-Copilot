import os
import requests
import sys

rel_path = os.path.join(os.path.dirname(__file__), "../")
abs_path = os.path.abspath(rel_path)

sys.path.append(abs_path + "\\agents")

from dalle_agent import DallEAgent

def main():
    # Initialize the DallEAgent with your API key, API version, and base URL
    api_key = os.getenv("AZURE_OPENAI_DALLE_KEY")
    api_key = "2e6bc1a191404217b624200eb7986d38"
    api_version = "2024-02-01"
    base_url = os.getenv("AZURE_OPENAI_DALLE_ENDPOINT")
    base_url = "https://dalle3-resource.openai.azure.com/"
    agent = DallEAgent(api_key=api_key, api_version=api_version, base_url=base_url, model="dalle-3")

    # Get user input for the image prompt
    prompt = input("Enter a description for the image: ")

    # Generate the image URL
    image_url = agent.generate_image(prompt)
    if image_url is None:
        print("Failed to generate image.")
        return

    # Download the image
    try:
        response = requests.get(image_url)
        response.raise_for_status()  # Check if the request was successful
        with open("output.png", "wb") as file:
            file.write(response.content)
        print("Image saved as output.png")
    except Exception as e:
        print(f"An error occurred while downloading the image: {e}")

if __name__ == "__main__":
    main()