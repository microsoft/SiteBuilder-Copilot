import sys, os
rel_path = os.path.join(os.path.dirname(__file__), ".")
abs_path = os.path.abspath(rel_path)
sys.path.insert(1, abs_path)

from dalle_agent import DallEAgent
from azure_agent import AzureOpenAIAgent