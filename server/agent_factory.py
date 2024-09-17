from agents import AzureOpenAIAgent, DallEAgent
from config import config
import os
import time

class AgentFactory:
    def __init__(self):
        self.session_agents = {}
        self.last_usage = {}
        self.api_key = config.AZURE_OPENAI_API_KEY
        self.base_url = config.AZURE_OPENAI_ENDPOINT
        self.model = config.AZURE_OPENAI_MODEL
        self.api_version = "2024-02-01"
        self.image_base_url = config.AZURE_OPENAI_DALLE_ENDPOINT
        self.image_api_key = config.AZURE_OPENAI_DALLE_KEY
        self.image_model = config.AZURE_OPENAI_DALLE_MODEL
        self.cleanup_interval = 60  # Check for inactive sessions every 60 seconds
        self.inactivity_threshold = 20 * 60  # 20 minutes

    def get_or_create_agents(self, session_id):
        self.cleanup_inactive_sessions()
        current_time = time.time()
        self.last_usage[session_id] = current_time

        if session_id not in self.session_agents:
            orchestrator_agent = AzureOpenAIAgent(
                api_key=self.api_key,
                api_version=self.api_version,
                base_url=self.base_url,
                model=self.model,
                system_message="You are an AI orchestrator for a website generator. Please provide a responses user inputs."
            )

            template_agent = AzureOpenAIAgent(
                api_key=self.api_key,
                api_version=self.api_version,
                base_url=self.base_url,
                model=self.model,
                system_message="You are an HTML generating agent for a website generator. Please provide html/css/javascript based on the user input."
            )

            image_gen_agent = DallEAgent(
                api_key=self.image_api_key,
                api_version=self.api_version,
                base_url=self.image_base_url,
                model=self.image_model
            )

            self.session_agents[session_id] = {
                "orchestrator_agent": orchestrator_agent,
                "template_agent": template_agent,
                "image_gen_agent": image_gen_agent
            }

        return self.session_agents[session_id]

    def cleanup_inactive_sessions(self):
        current_time = time.time()
        inactive_sessions = [
            session_id for session_id, last_used in self.last_usage.items()
            if current_time - last_used > self.inactivity_threshold
        ]

        for session_id in inactive_sessions:
            del self.session_agents[session_id]
            del self.last_usage[session_id]
