# Cloud File Manager

Cloud File Manager is a cutting-edge, cloud-based file management and editing solution built with Node.js, Express, and the Monaco Editor. It provides a robust set of tools to efficiently manage, edit, and organize your files and directories—all through a modern web interface.

## Overview

Cloud File Manager combines powerful back-end functionality with an intuitive, responsive front-end. Whether you're managing code files or organizing media, this solution streamlines your workflow by integrating secure authentication, comprehensive file operations, and an advanced code editor.

## Detailed Features

### Authentication & Security
- **Secure Login:**  
  Utilizes a simple password-based login with cookie-based session management for secure access.
- **Configurable Settings:**  
  Easily adjust authentication credentials and session timeouts, with support for HTTP-only cookies.

### Intuitive File Explorer
- **Responsive Interface:**  
  Enjoy a sleek, dark-themed UI that adapts seamlessly across desktops and mobile devices.
- **Dynamic Search:**  
  Quickly filter and locate files using a real-time search bar.
- **Drag & Drop:**  
  Move files effortlessly within your directory structure and upload external files via intuitive drag-and-drop functionality.

### Advanced File Operations
- **Comprehensive CRUD:**  
  Create, rename, and delete files or folders with ease.
- **Move & Copy:**  
  Seamlessly relocate or duplicate files and directories within the system.
- **ZIP Extraction:**  
  Directly extract ZIP archives within the application (RAR extraction is not implemented).

### File Upload & Download
- **Real-Time Progress Tracking:**  
  Monitor your uploads with dynamic progress indicators.
- **Curl Integration:**  
  Download files from external URLs using the built-in curl endpoint.

### Integrated Code Editor
- **Monaco Editor:**  
  Benefit from a powerful code editor with syntax highlighting for various programming languages.
- **Auto-Save Feature:**  
  Automatically save changes once a significant update is detected.

## Installation

### Prerequisites
- Node.js v12 or later  
- npm

### Steps

```sh
git clone https://github.com/yourusername/cloud-file-manager.git
cd cloud-file-manager
npm install
```

## Usage

Start the server with the following command:

```sh
node server.js
```

Then, open your web browser and navigate to [http://localhost:3999](http://localhost:3999) to access the application.

## API Endpoints

- **/login:**  
  Authenticate using a simple password.
- **/check-login:**  
  Verify your current authentication status.
- **/list:**  
  Retrieve a list of files and directories from the base storage.
- **/get-file:**  
  Fetch file content with support for media streaming and range requests.
- **/rename, /delete, /new-folder, /new-file, /save-file:**  
  Execute standard file operations.
- **/move, /copy:**  
  Move or duplicate files and directories within the system.
- **/extract:**  
  Extract ZIP archives.
- **/upload:**  
  Upload files with progress tracking.
- **/curl:**  
  Download files from external URLs.

## Conclusion

Cloud File Manager is the perfect tool for developers and users alike, offering a feature-rich and modern approach to file management and code editing. Enjoy the powerful functionality and intuitive design, and feel free to contribute or customize it to better suit your needs!

**Made With 💖 by RubahIlang**
