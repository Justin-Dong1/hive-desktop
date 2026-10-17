# Third-party notices

Original project code is licensed under GPL-3.0-only (see LICENSE). This does not relicense third-party code. Version 1.1.3 replaces the old Ms-PL NAudio 1.10 dependency with MIT-licensed NAudio 2.2.1 modules. Old installers are not retroactively relicensed or updated.

## Optional NAudio frequency spectrum component

The spectrum helper uses NAudio.Core 2.2.1 and NAudio.Wasapi 2.2.1 under the MIT license. Both official NuGet packages declare MIT. Wasapi depends only on Core for the netstandard2.0 target; Core declares no additional package dependencies for that target.

Copyright 2020 Mark Heath (license text); package metadata also credits Mark Heath, 2023. Full upstream license: `licenses/NAudio-2.2.1.txt`. Installer builds retain it at `resources/app/vendor/NAudio-2.2.1/LICENSE.txt`, next to NAudio.Core.dll, NAudio.Wasapi.dll and HiveSpectrum.exe.

- Core: https://api.nuget.org/v3-flatcontainer/naudio.core/2.2.1/naudio.core.2.2.1.nupkg
- Wasapi: https://api.nuget.org/v3-flatcontainer/naudio.wasapi/2.2.1/naudio.wasapi.2.2.1.nupkg
- License: https://github.com/naudio/NAudio/blob/v2.2.1/license.txt
- Source: https://github.com/naudio/NAudio/tree/v2.2.1

The Electron runtime retains its upstream LICENSE.electron.txt and LICENSES.chromium.html in the installer. Do not remove these notices when redistributing.

## Shell icon extraction

The Windows Shell icon extraction technique in `tools/scan-desktop.ps1` is adapted from [SmokerDKV/neon-desktop](https://github.com/SmokerDKV/neon-desktop).

MIT License

Copyright (c) 2026 NEON SHELL contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
