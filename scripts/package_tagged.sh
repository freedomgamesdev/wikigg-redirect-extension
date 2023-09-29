#!/bin/bash

FILE_LIST='built icons popup.html sites.json'

function _package_for() {
	echo "PACKAGING EXTENSION FOR TARGET ${1^^}"

	TAG="$2"
	MANIFEST="manifests/$1_$TAG.json"
	VERSION=`cat $MANIFEST | jq -r '.version'`
	TARBALL="pkgs/Generic_${1^}_$VERSION-${TAG}1.zip"
	echo "MANIFEST: $MANIFEST"
	echo "VERSION:  $VERSION"
	echo "TAG:      $TAG"
	echo "OUTPUT:   $TARBALL"

	zip -r $TARBALL $FILE_LIST $MANIFEST
	7za rn $TARBALL $MANIFEST manifest.json
}


npm run build
for target in chrome firefox; do
	_package_for $target $1
done
