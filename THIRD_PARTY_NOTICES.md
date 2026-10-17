# Third-party notices

Original project code is licensed under GPL-3.0-only (see LICENSE). This does not relicense third-party code. NAudio 1.10 uses Ms-PL, listed by GNU as GPL-incompatible. Existing bundled installers must remain unpublished pending dependency compatibility resolution and a fresh build; see docs/PUBLIC-READINESS.md.

## Optional NAudio frequency spectrum component

The optional spectrum helper uses NAudio 1.10.0 under the Microsoft Public License (Ms-PL). Binaries are not included in this source repository. Obtain the official package and retain its licensing information when redistributing builds:

Copyright (c) Mark Heath and contributors, 2020. Installer builds include NAudio.dll and the complete license in `resources/app/vendor/NAudio-1.10/LICENSE.txt`.

- Package: https://api.nuget.org/v3-flatcontainer/naudio/1.10.0/naudio.1.10.0.nupkg
- License: https://github.com/naudio/NAudio/blob/v1.10.0/license.txt

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
