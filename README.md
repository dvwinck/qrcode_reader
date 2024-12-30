# QR Code Reader SPA

This is a simple Single Page Application (SPA) for reading QR codes using the device's camera. The application captures QR codes, adds them to a list, and allows the list to be exported as a `.txt` file.

## Features

- **Camera Access**: Utilizes the device's camera to scan QR codes.
- **QR Code Detection**: Reads QR codes continuously with a 1-second interval between scans.
- **Duplicate Prevention**: Ensures that duplicate QR codes are not added to the list.
- **Export Functionality**: Allows the user to export the list of scanned QR codes as a `.txt` file.

## Requirements

- A modern web browser that supports WebRTC and JavaScript.
- A device with a functional camera (e.g., smartphone, tablet, or laptop).

## Usage Instructions

1. Open the application in a supported browser.
2. Allow camera access when prompted.
3. Point the camera at a QR code to scan it.
4. Scanned QR codes will appear in the list below the video.
5. Click the "Export as TXT" button to download the list of scanned QR codes.

## Project Structure

- **HTML**: Provides the structure of the application.
- **CSS**: Adds basic styling to the interface.
- **JavaScript**: Implements the QR code reading and list management functionality using the [ZXing library](https://github.com/zxing-js/library).


## Libraries Used

- **ZXing Library**: For QR code decoding.

## Future Improvements

- Add a progress indicator or notification for each successful QR code scan.
- Make the application installable as a Progressive Web Application (PWA).
- Support multi-language interfaces.

## License

This project is licensed under the MIT License. Feel free to use, modify, and distribute it.

