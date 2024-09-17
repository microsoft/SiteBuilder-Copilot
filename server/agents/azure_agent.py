from openai import AzureOpenAI

class AzureOpenAIAgent:
    def __init__(self, api_key: str, api_version: str, base_url: str, model: str = "gpt-4o", system_message: str = None):
        """
        Initializes the OpenAILLMAgent class with the given API key, API version, model, and optional system message.
        
        :param api_key: The API key for OpenAI.
        :param api_version: The API version for Azure OpenAI.
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
    
    def send_prompt(self, prompt: str, file_content: bytes = None) -> dict:
        """
        Sends a prompt to the LLM and returns the response. Continues an existing conversation if a conversation ID is provided.
        
        :param prompt: The text prompt to send to the LLM.
        :param file_content: The content of the file to be uploaded, if any.
        :return: A dictionary containing the LLM's response.
        """
        # Add user prompt to messages
        self.messages.append({"role": "user", "content": prompt})
        
        # If file content is provided, add it to the messages
        if file_content:
            self.messages.append({"role": "user", "content": f"File content: {file_content}"})
        
        # Send the conversation history to the model
        response = self.client.chat.completions.create(
            model=self.model,
            messages=self.messages,
            max_tokens=4000 
        )
            
        # Add LLM's response to the conversation history
        response_message = response.choices[0].message.content
        
        # Add LLM's response to the conversation history
        self.messages.append({"role": "assistant", "content": response_message})
        
        return response_message

    def get_image(self, prompt: str) -> str:
        """
        Sends a prompt to the LLM and returns the response. Continues an existing conversation if a conversation ID is provided.
        
        :param prompt: The text prompt to send to the LLM.
        :return: A dictionary containing the LLM's response.
        """
        # Add user prompt to messages
        self.messages.append({"role": "user", "content": prompt})
        
        response = self.client.images.generate(
            model=self.model,
            prompt=prompt,
            n=1,
            size="1024x1024"
        )
            
        # Extract the image URL from the response
        image_url = response['data'][0]['url']
        
        # Add LLM's response to the conversation history
        self.messages.append({"role": "assistant", "content": image_url})
        
        print("Image URL: {0}".format(image_url))
        return image_url
    
    def reset(self):
        """
        Resets the conversation history, effectively creating a new chat.
        """
        self.messages = []
        if hasattr(self, 'system_message') and self.system_message:
            self.messages.append({"role": "system", "content": self.system_message})    