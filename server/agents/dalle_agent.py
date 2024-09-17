from openai import AzureOpenAI
import json
import os

class DallEAgent:
    def __init__(self, api_key: str, api_version: str, base_url:str, model: str = "dall-e-3", messages: list = None):
        """
        Initialize the ImageGenerationAgent with the necessary API key.

        :param api_key: Your OpenAI API key.
        :param api_version: The API version for Azure OpenAI.
        :param base_url: The base URL for Azure OpenAI.
        :param model: The model name to use, default is 'gpt-4o'.
        :param messages: An optional list of messages to initialize the conversation history.
        """
        self.api_key = api_key
        self.api_version = api_version
        self.base_url = base_url
        self.model = model
        self.messages = messages if messages is not None else []

        print("Initializing ImageGenerationAgent...")
        self.client = AzureOpenAI(
            api_key=api_key,
            api_version=api_version,
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

    def serialize(self) -> str:
        """
        Serializes the state of the agent to a JSON string.

        :return: A JSON string representing the state of the agent.
        """
        return json.dumps({
            "api_key": self.api_key,
            "api_version": self.api_version,
            "base_url": self.base_url,
            "model": self.model,
            "messages": self.messages
        })

    @classmethod
    def deserialize(cls, json_str: str):
        """
        Deserializes a JSON string to a DallEAgent instance.

        :param json_str: A JSON string representing the state of the agent.
        :return: A DallEAgent instance.
        """
        data = json.loads(json_str)
        return cls(
            api_key=data["api_key"],
            api_version=data["api_version"],
            base_url=data["base_url"],
            model=data["model"],
            messages=data["messages"]
        )

    def save(self, filepath: str):
        """
        Saves the serialized state of the agent to a file.
        
        :param filepath: The path to the file where the state should be saved.
        """
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        with open(filepath, 'w') as f:
            f.write(self.serialize())

    @classmethod
    def load(cls, filepath: str):
        """
        Loads the state of the agent from a file and returns a DallEAgent instance.

        :param filepath: The path to the file from which the state should be loaded.
        :return: A DallEAgent instance.
        """
        with open(filepath, 'r') as f:
            json_str = f.read()
        return cls.deserialize(json_str)