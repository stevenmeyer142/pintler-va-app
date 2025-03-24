BASEDIR=$(dirname "$0")
OUT_DIR=tsc_out
cd $BASEDIR
rm -Rf $OUT_DIR
mkdir $OUT_DIR
cd src
npm ci --omit=dev
tsc --build
cd ..
cp -R src/views $OUT_DIR
cp src/*.png $OUT_DIR
cp -R src/node_modules $OUT_DIR