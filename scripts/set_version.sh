#!/bin/bash

function _print_ver() {
	echo -e "$1`jq '.version' $2`"
}

for manifest in ./manifests/*_rel.json; do
	echo $manifest:
	_print_ver "\tCurrent: " $manifest
	jq --indent 4 --arg a "$1" '.version = $a' $manifest > $manifest.tmp
	mv $manifest.tmp $manifest
	_print_ver "\tNew:\t " $manifest
done
