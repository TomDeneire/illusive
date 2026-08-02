.PHONY: run build build-windows test release

run:
	wails dev -tags webkit2_41
build:
	wails build -tags webkit2_41
build-windows:
	wails build -platform windows/amd64 -nsis=false
test:
	go test ./...
release:
	@test -n "$(VERSION)" || (echo "Usage: make release VERSION=v0.1.0" && exit 1)
	sed -i 's/"productVersion": "[^"]*"/"productVersion": "$(VERSION:v%=%)"/' wails.json
	$(MAKE) build
	$(MAKE) build-windows
	git add wails.json
	git commit -m "(chore): bump version to $(VERSION)"
	git tag $(VERSION)
	git push origin main $(VERSION)
	gh release create $(VERSION) build/bin/illusive build/bin/illusive.exe illusive.db --title "$(VERSION)" --notes ""
