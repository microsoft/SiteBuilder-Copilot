# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

import os
import requests
import sys

rel_path = os.path.join(os.path.dirname(__file__), "../")
abs_path = os.path.abspath(rel_path)

sys.path.append(abs_path + "\\agents")

from azure_agent import AzureOpenAIAgent

def main():
    api_key = os.getenv("AZURE_OPENAI_API_KEY") 
    base_url = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_version = "2024-02-01"

    agent = AzureOpenAIAgent(
        api_key=api_key,
        api_version=api_version,
        base_url=base_url,
        model="gpt4o",
        #model="gpt4o-mini",
        system_message="You are a knowledgeable assistant."
    )

    while True:
        print("Input Prompt:")
        message = input()

        output = agent.send_prompt(message)
        print("Output:")
        print(output)

if __name__ == "__main__":
    main()