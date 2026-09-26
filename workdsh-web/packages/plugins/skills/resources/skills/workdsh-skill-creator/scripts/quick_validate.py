#!/usr/bin/env python3
"""
Quick validation script for skills - minimal version
"""

import sys
import os
import re
from pathlib import Path

def validate_skill(skill_path):
    """Basic validation of a skill"""
    skill_path = Path(skill_path)

    # Check SKILL.md exists
    skill_md = skill_path / 'SKILL.md'
    if not skill_md.exists():
        return False, "SKILL.md not found"

    # Read and validate frontmatter
    content = skill_md.read_text()
    if not content.startswith('---'):
        return False, "No YAML frontmatter found"

    # Extract frontmatter
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return False, "Invalid frontmatter format"

    frontmatter = match.group(1)

    # Check required fields
    if 'name:' not in frontmatter:
        return False, "Missing 'name' in frontmatter"
    if 'description:' not in frontmatter:
        return False, "Missing 'description' in frontmatter"

    # Extract name for validation
    name_match = re.search(r'name:\s*(.+)', frontmatter)
    if name_match:
        name = name_match.group(1).strip()
        # Check naming convention (hyphen-case: lowercase with hyphens)
        if not re.match(r'^[a-z0-9-]+$', name):
            return False, f"Name '{name}' should be hyphen-case (lowercase letters, digits, and hyphens only)"
        if name.startswith('-') or name.endswith('-') or '--' in name:
            return False, f"Name '{name}' cannot start/end with hyphen or contain consecutive hyphens"

    # Extract and validate description
    desc_match = re.search(r'description:\s*(.+)', frontmatter)
    if desc_match:
        description = desc_match.group(1).strip()
        # Check for angle brackets
        if '<' in description or '>' in description:
            return False, "Description cannot contain angle brackets (< or >)"

    if skill_path.name != name:
        return False, "Skill name must match directory name"
    for file in skill_path.rglob('*'):
        if file.is_symlink():
            return False, "Symbolic links are not supported: " + str(file)
        if file.is_file() and file.suffix in ['.md', '.py', '.txt']:
            text = file.read_text(encoding='utf-8')
            if '[TODO:' in text or file.name in ['example.py', 'api_reference.md', 'example_asset.txt']:
                return False, "Unresolved initialization placeholder: " + str(file)
            if file.suffix == '.md':
                links = re.findall(r'\[[^\]]*\]\(([^)]+)\)', text)
                for link in links:
                    link = link.strip().split('#', 1)[0].strip('<>')
                    if not link or ':' in link or link.startswith('/'):
                        continue
                    target = (file.parent / link).resolve()
                    if skill_path.resolve() not in target.parents or not target.exists():
                        return False, "Missing or out-of-bundle reference: " + link
    return True, "Basic structure and local references are valid; runtime trial and Harness parsing remain separate."


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python quick_validate.py <skill_directory>")
        sys.exit(1)

    valid, message = validate_skill(sys.argv[1])
    print(message)
    sys.exit(0 if valid else 1)
