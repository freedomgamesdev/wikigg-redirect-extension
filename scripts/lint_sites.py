import json
import re
import sys
import textwrap
from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Callable, Iterable


@dataclass
class LintNotice:
    node_id: int
    wiki_id: str|None
    message: str
    property: str|None = None

    def __str__(self):
        result = f'In `{self.wiki_id or '<unknown>'}` (node #{self.node_id})'
        if self.property:
            result = f'{result}, property `{self.property}`'
        result = f'{result}:\n\t{self.message}'
        return result


@dataclass
class LintViolation(LintNotice): ...


@dataclass
class LintFatal(LintNotice): ...


BUCKET_TEXT = {
    LintFatal.__name__: ('[!!!] Fatal errors', 'error(s)'),
    LintViolation.__name__: ('[ !!] Violations', 'violation(s)'),
    LintNotice.__name__: ('[ ! ] Warnings', 'warning(s)'),
}


def lint_sites_data(data: list[Any]) -> Iterable[LintNotice]:
    def __lint_node__(node: Any, node_id: int, wiki_id: str|None) -> Iterable[LintNotice]:
        if isinstance(node, list):
            wiki_id = node[0].get('id', None)
            yield LintFatal(node_id, wiki_id, message='This site group must be migrated into the Sites V2 project.')
            return
        elif not isinstance(node, dict):
            yield LintFatal(node_id, wiki_id, message='Node is not an object.')

        if node.get('$README', False):
            return
        
        if 'oldId' in node or 'oldid' in node:
            yield LintViolation(node_id, wiki_id, 'Property no longer used in Sites V2. Move into `redirect`.', 'oldId')
        
        if 'redirect' not in node:
            yield LintFatal(node_id, wiki_id, 'Node has no redirection configured.')
        
        if 'search' in node:
            yield LintViolation(node_id, wiki_id, 'Property no longer used in Sites V2. Move into `redirect`.', 'search')
        
        if 'name' not in node:
            yield LintFatal(node_id, wiki_id, 'Site name is missing.', 'name')
        else:
            if 'Wiki' not in node.get('name'):
                yield LintNotice(node_id, wiki_id, 'Site name is missing `Wiki`. This may or may not be a mistake.', 'name')


    for node_id, node in enumerate(data):
        wiki_id = None
        if isinstance(node, dict):
            wiki_id = node.get('id', None)
        yield from __lint_node__(node, node_id, wiki_id)


if __name__ == '__main__':
    print('Loading sites data and checking for compliance...')

    with open(sys.argv[1], 'rt') as fp:
        data = json.load(fp)

    buckets = defaultdict(list)
    for notice in lint_sites_data(data):
        buckets[notice.__class__.__name__].append(notice)
    
    for bucket_id, notices in buckets.items():
        print('')
        print(f'{BUCKET_TEXT.get(bucket_id, (bucket_id,))[0]} ({len(notices)}):')
        for notice in notices:
            formatted = textwrap.indent(str(notice), '\t')
            print(formatted)
    
    print()
    found_strs = []
    for bucket_id, text in BUCKET_TEXT.items():
        notices = buckets.get(bucket_id, [])
        found_strs.append(f'{len(notices)} {text[1]}')
    print(f'Summary: found {", ".join(found_strs)}.')

    if LintFatal.__name__ in buckets:
        sys.exit(1)
