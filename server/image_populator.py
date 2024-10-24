# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

import os
import requests
import re
import json
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from agent_factory import AgentFactory

class ImagePopulator:
    def __init__(self, html_path: str, image_output_folder: str, session_id: str, agents: any):
        print(f"Initializing ImagePopulator with html_path: {html_path}, image_output_folder: {image_output_folder}, session_id: {session_id}")
        self.html_path = html_path
        self.image_output_folder = image_output_folder
        self.session_id = session_id
        self.session_dir = self.get_session_directory()

        self.prompt_gen_agent = agents["image_prompt_agent"]
        self.image_gen_agent = agents["image_gen_agent"]
        self.template_agent = agents["template_agent"]

        if not os.path.exists(self.image_output_folder):
            os.makedirs(self.image_output_folder)
            print(f"Created image output folder at: {self.image_output_folder}")

    def get_session_directory(self):
        current_dir = os.path.dirname(os.path.abspath(__file__))
        return os.path.join(current_dir, 'jobs', self.session_id)

    def create_image_lockfile(self):
        lockfile_path = os.path.join(self.image_output_folder, 'images.lock')
        with open(lockfile_path, 'w') as f:
            pass
        print(f"Created lockfile at: {lockfile_path}")

    def delete_image_lockfile(self):
        lockfile_path = os.path.join(self.image_output_folder, 'images.lock')
        if os.path.exists(lockfile_path):
            os.remove(lockfile_path)
            print(f"Deleted lockfile at: {lockfile_path}")
        else:
            print(f"Lockfile not found at: {lockfile_path}")


    def process(self):
        self.create_image_lockfile()
        print("Starting process method.")
        # Read the index.html file
        with open(self.html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        print("Read HTML content from file.")

        # Parse the HTML with BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        print("Parsed HTML content with BeautifulSoup.")

        placeholder_src = "/img/loading_gradient.gif"
        placeholders = []

        # Find all <img> tags with src=placeholder_src
        img_placeholders = soup.find_all('img', src=placeholder_src)
        print(f"Found {len(img_placeholders)} <img> placeholders.")
        for img in img_placeholders:
            alt_text = img.get('alt', '')
            placeholders.append({
                'type': 'img',
                'tag': img,
                'description': alt_text
            })

        # Find elements with style attributes containing background-image
        background_image_pattern = re.compile(r'background-image\s*:\s*url\([\'"]?(.+?)[\'"]?\)\s*;?')

        elements_with_style = soup.find_all(style=True)
        print(f"Found {len(elements_with_style)} elements with style attributes.")
        for elem in elements_with_style:
            style_content = elem['style']
            matches = background_image_pattern.findall(style_content)
            for match in matches:
                if match.strip() == placeholder_src:
                    description = elem.get('data-description', '')  # Try to get description from data attribute
                    placeholders.append({
                        'type': 'style',
                        'tag': elem,
                        'description': description,
                        'style_attribute': style_content
                    })

        # Find <style> tags and parse CSS content
        css_background_image_pattern = re.compile(
            r'background-image\s*:\s*url\([\'"]?(.+?)[\'"]?\);\s*/\*(.*?)\*/', re.DOTALL)

        style_tags = soup.find_all('style')
        print(f"Found {len(style_tags)} <style> tags.")
        for style_tag in style_tags:
            css_content = style_tag.string
            if css_content:
                matches = css_background_image_pattern.findall(css_content)
                for url, comment in matches:
                    if url.strip() == placeholder_src:
                        description = comment.strip()
                        placeholders.append({
                            'type': 'css',
                            'style_tag': style_tag,
                            'description': description,
                            'url': url
                        })

        print(f"Total placeholders found: {len(placeholders)}")

        # Initialize metadata dictionary
        metadata_file_path = os.path.join(self.image_output_folder, 'metadata.json')
        if os.path.exists(metadata_file_path):
            with open(metadata_file_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            print(f"Loaded existing metadata from {metadata_file_path}")
        else:
            metadata = {
                'imageCount': 0,
                'mappings': []
            }

        start_index = metadata['imageCount']
        processed_images = 0  # Count of images processed in this run

        # Process each placeholder
        for placeholder in placeholders:
            index = start_index + processed_images
            description = placeholder['description']
            if not description:
                print(f"No description found for placeholder at index {index}, skipping.")
                continue
            print(f"Processing placeholder {index} with description: {description}")

            # Get image prompt from LLM
            image_prompt = self.prompt_gen_agent.send_prompt(description)
            self.prompt_gen_agent.save(os.path.join(self.session_dir, 'agents', 'prompt_gen_agent.json'))
            placeholder['image_prompt'] = image_prompt
            print(f"Generated image prompt: {image_prompt}")

            # Generate image using DALL·E agent
            image_url = self.image_gen_agent.generate_image(image_prompt)
            self.image_gen_agent.save(os.path.join(self.session_dir, 'agents', 'image_gen_agent.json'))
            placeholder['image_url'] = image_url
            print(f"Generated image URL: {image_url}")

            # Download image and save to disk
            response = requests.get(image_url)
            if response.status_code == 200:
                image_filename = f'image_{index}.jpg'
                image_path = os.path.join(self.image_output_folder, image_filename)
                with open(image_path, 'wb') as f:
                    f.write(response.content)
                placeholder['image_path'] = image_filename  # Use relative path
                print(f"Downloaded and saved image to: {image_path}")
            else:
                print(f'Failed to download image from {image_url}')
                placeholder['image_path'] = None
                continue  # Skip to the next placeholder if image download failed

            # Prepare data for metadata mapping
            mapping = {
                'index': index,
                'type': placeholder['type'],
                'description': description,
                'image_prompt': image_prompt,
                'image_url': image_url,
                'image_path': placeholder.get('image_path')
            }

            # Get the old element HTML before modification
            if placeholder['type'] == 'img':
                old_element_html = str(placeholder['tag'])
            elif placeholder['type'] == 'style':
                old_element_html = str(placeholder['tag'])
            elif placeholder['type'] == 'css':
                old_element_html = str(placeholder['style_tag'])

            mapping['old_element_html'] = old_element_html

            # Save mapping in placeholder for later use
            placeholder['mapping'] = mapping

            # Increment processed_images and imageCount
            processed_images += 1
            metadata['imageCount'] += 1

            # Append mapping to metadata
            metadata['mappings'].append(mapping)

        # Update the HTML with new image paths and collect new element HTML
        for placeholder in placeholders:
            mapping = placeholder.get('mapping', {})
            if placeholder.get('image_path'):
                new_image_url = urljoin(f'http://127.0.0.1:5000/{self.session_id}/template/img/', placeholder['image_path'])

                if placeholder['type'] == 'img':
                    img_tag = placeholder['tag']
                    img_tag['src'] = new_image_url
                    print(f"Updated <img> tag with new src: {new_image_url}")

                    # Get new element HTML
                    new_element_html = str(img_tag)
                    mapping['new_element_html'] = new_element_html

                elif placeholder['type'] == 'style':
                    elem = placeholder['tag']
                    style_content = elem['style']
                    new_style_content = style_content.replace(placeholder_src, new_image_url)
                    elem['style'] = new_style_content
                    print(f"Updated style attribute with new background-image URL: {new_image_url}")

                    # Get new element HTML
                    new_element_html = str(elem)
                    mapping['new_element_html'] = new_element_html

                elif placeholder['type'] == 'css':
                    style_tag = placeholder['style_tag']
                    css_content = style_tag.string
                    new_css_content = css_content.replace(placeholder_src, new_image_url)
                    style_tag.string.replace_with(new_css_content)
                    print(f"Updated <style> tag with new background-image URL: {new_image_url}")

                    # Get new element HTML
                    new_element_html = str(style_tag)
                    mapping['new_element_html'] = new_element_html

            else:
                print(f"No image generated for placeholder at index {mapping.get('index')}")

        # Write the modified HTML back to the file
        with open(self.html_path, 'w', encoding='utf-8') as f:
            f.write(str(soup))
        print("Wrote modified HTML content back to file.")

        # Write the metadata .json file
        with open(metadata_file_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=4)
        print(f"Wrote metadata to {metadata_file_path}")

        # Update the assistant message content in the template_agent
        print("Updating the assistant message content in the template_agent.")
        assistant_messages = [msg for msg in self.template_agent.messages if msg['role'] == 'assistant']
        if assistant_messages:
            last_assistant_message = assistant_messages[-1]
            assistant_html_content = last_assistant_message['content']
            # Parse the assistant's HTML content
            soup_template = BeautifulSoup(assistant_html_content, 'html.parser')
            print("Parsed assistant's HTML content with BeautifulSoup.")

            # Update the assistant's HTML content using the mappings
            for mapping in metadata['mappings']:
                placeholder_type = mapping['type']
                old_element_html = mapping['old_element_html']
                new_element_html = mapping['new_element_html']

                if placeholder_type == 'img':
                    # Find and replace the old <img> tag
                    old_tag = BeautifulSoup(old_element_html, 'html.parser').find('img')
                    new_tag = BeautifulSoup(new_element_html, 'html.parser').find('img')
                    if old_tag and new_tag:
                        for img_tag in soup_template.find_all('img', src=placeholder_src):
                            if img_tag.get('alt', '') == old_tag.get('alt', ''):
                                img_tag.replace_with(new_tag)
                                print(f"Replaced <img> tag in assistant's HTML content.")

                elif placeholder_type == 'style':
                    # Find and replace the style attribute in the element
                    old_tag = BeautifulSoup(old_element_html, 'html.parser').find()
                    new_tag = BeautifulSoup(new_element_html, 'html.parser').find()
                    if old_tag and new_tag:
                        for elem in soup_template.find_all(style=True):
                            if elem['style'] == old_tag['style']:
                                elem['style'] = new_tag['style']
                                print(f"Updated style attribute in assistant's HTML content.")

                elif placeholder_type == 'css':
                    # Replace the CSS content in the <style> tag
                    old_style_content = BeautifulSoup(old_element_html, 'html.parser').string
                    new_style_content = BeautifulSoup(new_element_html, 'html.parser').string
                    for style_tag in soup_template.find_all('style'):
                        if style_tag.string and style_tag.string.strip() == old_style_content.strip():
                            style_tag.string.replace_with(new_style_content)
                            print(f"Updated <style> tag content in assistant's HTML content.")

            # Update the assistant message's content
            last_assistant_message['content'] = str(soup_template)
            print("Assistant message content updated with modified HTML.")
        else:
            print("No assistant messages found in the template_agent.")
        self.template_agent.save(os.path.join(self.session_dir, 'agents', 'template_agent.json'))
        self.delete_image_lockfile()
