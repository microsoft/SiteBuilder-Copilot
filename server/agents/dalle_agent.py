from openai import AzureOpenAI
import requests
import base64

class DallEAgent:
    def __init__(self, api_key: str, api_version: str, base_url:str, model: str = "gpt-4o", system_message: str = None):
        """
        Initialize the ImageGenerationAgent with the necessary API key.

        :param api_key: Your OpenAI API key.
        """
        self.model = model
        print("Initializing ImageGenerationAgent...")
        self.client = AzureOpenAI(
            api_key=api_key,
            api_version="2024-02-01",
            azure_endpoint=base_url
        )
        print("Initialization complete.")

    def generate_image(self, prompt, size="1024x1024"):
        """
        Generate an image based on the provided prompt.

        :param prompt: The textual description for the image.
        :param size: The size of the generated image (default is '1024x1024').
        :return: The URL of the generated image.
        """
        print(f"Generating image with prompt: '{prompt}' and size: '{size}'")
        try:
            response = self.client.images.generate(
                prompt=prompt,
                n=1,
                size=size,
                quality="standard",
                model=self.model
            )
            print("Image generation response received.")
            image_url = response.data[0].url
            print(f"Generated image URL: {image_url}")
            return image_url
        except Exception as e:
            print(f"An error occurred during image generation: {e}")
            return None

    def get_base64_image(self, prompt, size="1024x1024"):
        """
        Generate an image and return its base64-encoded representation.

        :param prompt: The textual description for the image.
        :param size: The size of the generated image (default is '1024x1024').
        :return: The base64-encoded string of the image.
        """
        print(f"Getting base64 image for prompt: '{prompt}' and size: '{size}'")
        image_url = self.generate_image(prompt, size)
        if image_url is None:
            print("Failed to generate image.")
            return None

        try:
            print(f"Downloading image from URL: {image_url}")
            # Download the image
            response = requests.get(image_url)
            response.raise_for_status()  # Check if the request was successful
            print("Image downloaded successfully.")
            image_content = response.content

            # Encode the image content to base64
            base64_image = base64.b64encode(image_content).decode('utf-8')
            print("Image encoded to base64 successfully.")
            return base64_image
        except Exception as e:
            print(f"An error occurred while fetching or encoding the image: {e}")
            return None