import os
import requests
import re
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from agent_factory import AgentFactory

class ImagePopulator:
    def __init__(self, html_path: str, image_output_folder: str, session_id: str):
        print(f"Initializing ImagePopulator with html_path: {html_path}, image_output_folder: {image_output_folder}, session_id: {session_id}")
        self.html_path = html_path
        self.image_output_folder = image_output_folder
        self.session_id = session_id
        self.agent_factory = AgentFactory()
        agents = self.agent_factory.get_or_create_agents(session_id)

        self.prompt_gen_agent = agents["image_prompt_agent"]
        self.image_gen_agent = agents["image_gen_agent"]

        if not os.path.exists(self.image_output_folder):
            os.makedirs(self.image_output_folder)
            print(f"Created image output folder at: {self.image_output_folder}")

    def process(self):
        print("Starting process method.")
        # Read the index.html file
        with open(self.html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        print("Read HTML content from file.")

        # Parse the HTML with BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        print("Parsed HTML content with BeautifulSoup.")

        placeholder_src = "/img/placeholder.jpg"
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
        background_image_pattern = re.compile(r'background-image\s*:\s*url\([\'"]?(.+?)[\'"]?\);?')

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

        # Process each placeholder
        for index, placeholder in enumerate(placeholders):
            description = placeholder['description']
            if not description:
                print(f"No description found for placeholder at index {index}, skipping.")
                continue
            print(f"Processing placeholder {index} with description: {description}")

            # Get image prompt from LLM
            image_prompt = self.prompt_gen_agent.send_prompt(description)
            placeholder['image_prompt'] = image_prompt
            print(f"Generated image prompt: {image_prompt}")

            # Generate image using DALL·E agent
            image_url = self.image_gen_agent.generate_image(image_prompt)
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

        # Update the HTML with new image paths
        for placeholder in placeholders:
            if placeholder.get('image_path'):
                new_image_url = urljoin(f'http://127.0.0.1:5000/{self.session_id}/template/img/', placeholder['image_path'])

                if placeholder['type'] == 'img':
                    img_tag = placeholder['tag']
                    img_tag['src'] = new_image_url
                    print(f"Updated <img> tag with new src: {new_image_url}")
                elif placeholder['type'] == 'style':
                    elem = placeholder['tag']
                    style_content = elem['style']
                    new_style_content = style_content.replace(placeholder_src, new_image_url)
                    elem['style'] = new_style_content
                    print(f"Updated style attribute with new background-image URL: {new_image_url}")
                elif placeholder['type'] == 'css':
                    style_tag = placeholder['style_tag']
                    css_content = style_tag.string
                    new_css_content = css_content.replace(placeholder_src, new_image_url)
                    style_tag.string.replace_with(new_css_content)
                    print(f"Updated <style> tag with new background-image URL: {new_image_url}")
            else:
                print(f"No image generated for placeholder: {placeholder}")

        # Write the modified HTML back to the file
        with open(self.html_path, 'w', encoding='utf-8') as f:
            f.write(str(soup))
        print("Wrote modified HTML content back to file.")