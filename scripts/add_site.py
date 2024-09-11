import argparse
import bisect
import json
import re
import requests
from functools import cache


@cache
def query_siteinfo(domain):
    r = requests.get(f'https://{domain}/api.php?action=query&meta=siteinfo&siprop=general&format=json')
    r = r.json()
    r = r['query']['general']
    return r


def normalise_args(args):
    if not args.new_id:
        if args.old_id:
            args.new_id = re.sub(r"[-]", '', args.old_id)
            print('derived new wiki ID from old ID:', args.new_id)
        else:
            print('at the minimum, either --old-id or --new-id must be specified')
            return

    if not args.name:
        r = query_siteinfo(f'{args.new_id}.wiki.gg')
        args.name = r['sitename'].removesuffix(' Wiki')
        print('fetched site name from wiki:', args.name)

    if not args.old_name:
        r = query_siteinfo(f'{args.old_id or args.new_id}.fandom.com')
        args.old_name = r['sitename'].removesuffix(' Wiki')
        print('fetched site name from old wiki:', args.old_name)


def add_wiki(args):
    with open('sites.json', 'rt') as fp:
        lists = json.load(fp)

    normalise_args(args)

    entry = dict()
    entry['id'] = args.new_id
    if args.old_id:
        entry['oldId'] = args.old_id
    entry['name'] = args.name
    if args.official:
        entry['official'] = True
    if args.old_name:
        entry['search'] = dict(
            oldName=args.old_name
        )

    print()
    print('generated entry:')
    print(json.dumps(entry, ensure_ascii=False))

    if any(isinstance(x, dict) and x.get('oldId', x.get('id', None)) == (args.old_id or args.new_id) for x in lists):
        print('id already present in the list - are you sure that this entry should be added? [y/n]', end=' ')
        if input() != 'y':
            return

    bisect.insort(lists, entry, key=lambda x: isinstance(x, dict) and x.get('id', None) or '____')

    if not args.dry_run:
        print('writing sites file')
        with open('sites.json', 'wt', encoding='utf-8') as fp:
            json.dump(lists, fp, indent='\t', ensure_ascii=False)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--old-id', type=str)
    parser.add_argument('--old-name', type=str)
    parser.add_argument('--new-id', type=str)
    parser.add_argument('--name', type=str)
    parser.add_argument('--official', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    add_wiki(args)
