BASEDIR=$(dirname "$0")
OUT_DIR=tsc_out
cd $BASEDIR
rm -Rf $OUT_DIR
mkdir $OUT_DIR
if ! command -v tsc &> /dev/null
then
    echo "TypeScript is not installed. Installing..."
    npm install -g typescript
fi
npm install
cd src
npm ci --omit=dev
tsc --build
cd ..
cp -R src/views $OUT_DIR
cp -R src/node_modules $OUT_DIR