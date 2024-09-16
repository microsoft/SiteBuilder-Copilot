import os
from agents import AzureOpenAIAgent, DallEAgent

class AgentInstances:
    __api_key = os.getenv("AZURE_OPENAI_API_KEY")
    __base_url = os.getenv("AZURE_OPENAI_ENDPOINT")
    __api_version = "2024-02-01"
    
    orchestrator = AzureOpenAIAgent(
        api_key=__api_key,
        api_version=__api_version,
        base_url=__base_url,
        model="gpt4o",
        system_message="You are an AI orchestrator for a website generator. Please provide a responses user inputs and manages the overall workflow and interaction with the user."
    )

    template = AzureOpenAIAgent(
        api_key=__api_key,
        api_version=__api_version,
        base_url=__base_url,
        model="gpt4o",
        system_message="You are an template generating agent for a website generator. Please provide html/css/javascript based on the user input."
    )

    analyzer = AzureOpenAIAgent(
        api_key=__api_key,
        api_version=__api_version,
        base_url=__base_url,
        model="gpt4o",
        system_message="You are an analyzer agent for a website generator. Please interpret the prompt and generate site specifications."
    )

    planner = AzureOpenAIAgent(
        api_key=__api_key,
        api_version=__api_version,
        base_url=__base_url,
        model="gpt4o",
        system_message="You are a planner agent for a website generator. Please break down the prompt into tasks and assign them to agents."
    )

    scripting = AzureOpenAIAgent(
        api_key=__api_key,
        api_version=__api_version,
        base_url=__base_url,
        model="gpt4o",
        system_message="You are a scripting agent for a website generator. Please add JavaScript functionality where needed."
    )

    styling = AzureOpenAIAgent(
        api_key=__api_key,
        api_version=__api_version,
        base_url=__base_url,
        model="gpt4o",
        system_message="You are a styling agent for a website generator. Please generate and apply CSS."
    )

    validator = AzureOpenAIAgent(
        api_key=__api_key,
        api_version=__api_version,
        base_url=__base_url,
        model="gpt4o",
        system_message="You are a validator agent for a website generator. Please ensure the output aligns with user expectations and specifications, providing feedback for improvements."
    )

    __image_resource_url = os.getenv("AZURE_OPENAI_DALLE_ENDPOINT")
    __image_api_key = os.getenv("AZURE_OPENAI_DALLE_KEY")
    image_gen = DallEAgent(api_key=__image_api_key, api_version=__api_version, base_url=__image_resource_url, model="dalle-3")