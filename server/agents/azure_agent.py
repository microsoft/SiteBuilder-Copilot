import json
import os
from openai import AzureOpenAI

class AzureOpenAIAgent:
    def __init__(self, api_key: str, api_version: str, base_url: str, model: str = "gpt-4o", system_message: str = None, messages: list = None):
        """
        Initializes the OpenAILLMAgent class with the given API key, API version, model, and optional system message.
        
        :param api_key: The API key for OpenAI.
        :param api_version: The API version for Azure OpenAI.
        :param model: The model name to use, default is 'gpt-4o'.
        :param system_message: An optional system message to guide the behavior of the LLM.
        :param messages: An optional list of messages to initialize the conversation history.
        """
        self.api_key = api_key
        self.api_version = api_version
        self.model = model
        self.messages = messages if messages is not None else []

        self.client = AzureOpenAI(
            api_key=api_key,
            api_version="2024-02-01",
            azure_endpoint=base_url
        )
                
        if system_message and not messages:
            self.messages.append({"role": "system", "content": system_message})
    
    def send_prompt(self, prompt: str, file_content: bytes = None) -> dict:
        """
        Sends a prompt to the LLM and returns the response. Continues an existing conversation if a conversation ID is provided.
        
        :param prompt: The text prompt to send to the LLM.
        :param file_content: The content of the file to be uploaded, if any.
        :return: A dictionary containing the LLM's response.
        """
        self.messages.append({"role": "user", "content": prompt})
        
        if file_content:
            self.messages.append({"role": "user", "content": f"File content: {file_content}"})
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=self.messages,
            max_tokens=4000 
        )
            
        response_message = response.choices[0].message.content
        self.messages.append({"role": "assistant", "content": response_message})
        
        return response_message

    def reset(self):
        """
        Resets the conversation history, effectively creating a new chat.
        """
        self.messages = []
        if hasattr(self, 'system_message') and self.system_message:
            self.messages.append({"role": "system", "content": self.system_message})

    def serialize(self) -> str:
        """
        Serializes the state of the agent to a JSON string.
        
        :return: A JSON string representing the state of the agent.
        """
        return json.dumps({
            "api_key": self.api_key,
            "api_version": self.api_version,
            "model": self.model,
            "messages": self.messages
        })

    @classmethod
    def deserialize(cls, json_str: str):
        """
        Deserializes a JSON string to an AzureOpenAIAgent instance.
        
        :param json_str: A JSON string representing the state of the agent.
        :return: An AzureOpenAIAgent instance.
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
        Loads the state of the agent from a file and returns an AzureOpenAIAgent instance.
        
        :param filepath: The path to the file from which the state should be loaded.
        :return: An AzureOpenAIAgent instance.
        """
        with open(filepath, 'r') as f:
            json_str = f.read()
        return cls.deserialize(json_str)