BASEDIR=$(dirname "$0")
cd $BASEDIR
rm -Rf dist
mkdir dist
cd src
npm ci --omit=dev
tsc --build
cd ..
cp -R src/views dist
cp src/*.png dist
cp -R src/node_modules dist