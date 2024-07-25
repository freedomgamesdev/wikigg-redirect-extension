import argparse
import bisect
import json


def add_wiki(args):
    with open('sites.json', 'rt') as fp:
        lists = json.load(fp)

    if not args.old_id and '-' in args.new_id:
        print('id contains dashes... assuming old')
        args.old_id = args.new_id.replace('-', '')

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

    print(json.dumps(entry, ensure_ascii=False))

    if any(isinstance(x, dict) and x.get('oldId', x.get('id', None)) == (args.old_id or args.new_id) for x in lists):
        print('id already present in the list - are you sure that this entry should be added? [y/n]', end=' ')
        if input() != 'y':
            return

    bisect.insort(lists, entry, key=lambda x: isinstance(x, dict) and x.get('id', None) or '____')

    with open('sites.json', 'wt', encoding='utf-8') as fp:
        json.dump(lists, fp, indent='\t', ensure_ascii=False)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--old-id', type=str)
    parser.add_argument('--old-name', type=str)
    parser.add_argument('--new-id', type=str, required=True)
    parser.add_argument('--name', type=str, required=True)
    parser.add_argument('--official', action='store_true')
    args = parser.parse_args()
    add_wiki(args)
