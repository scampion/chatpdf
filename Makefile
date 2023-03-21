all: bundle.js 

bundle.js: app.ts
	tsc app.ts && ./node_modules/.bin/browserify app.js > bundle.js	

