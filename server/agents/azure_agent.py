from openai import AzureOpenAI

class AzureOpenAIAgent:
    def __init__(self, api_key: str, api_version: str, base_url:str, model: str = "gpt-4o", system_message: str = None):
        """
        Initializes the AzureOpenAIAgent class with the given API key, API version, model, and optional system message.
        
        :param api_key: The API key for Azure OpenAI.
        :param api_version: The API version for Azure OpenAI.
        :param base_url: The base URL for the Azure OpenAI endpoint.
        :param model: The model name to use, default is 'gpt-4o'.
        :param system_message: An optional system message to guide the behavior of the LLM.
        """
        self.api_key = api_key
        self.api_version = api_version
        self.model = model
        self.messages = []

        self.client = AzureOpenAI(
            api_key=api_key,
            api_version="2024-02-01",
            azure_endpoint=base_url
        )
                
        # If a system message is provided, set it as the initial message
        if system_message:
            self.messages.append({"role": "system", "content": system_message})
    
    def send_prompt(self, prompt: str) -> dict:
        """
        Sends a prompt to the LLM and returns the response.
        
        :param prompt: The text prompt to send to the LLM.
        :return: A string containing the LLM's response.
        """
        # Add user prompt to messages
        self.messages.append({"role": "user", "content": prompt})
        
        # Send the conversation history to the model
        response = self.client.chat.completions.create(
            model=self.model,
            messages=self.messages,
            max_tokens=2000 
        )
            
        # Add LLM's response to the conversation history
        response_message = response.choices[0].message.content
        
        # Add LLM's response to the conversation history
        self.messages.append({"role": "assistant", "content": response_message})
        
        return response_message