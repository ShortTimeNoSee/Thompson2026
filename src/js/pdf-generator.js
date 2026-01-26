function loadPdfLib() {
    return new Promise((resolve, reject) => {
        if (window.PDFLib) {
            resolve(window.PDFLib);
            return;
        }
        
        const script = document.createElement('script');
        script.src = '/js/vendor/pdf-lib.min.js';
        script.onload = () => {
            if (window.PDFLib) {
                resolve(window.PDFLib);
            } else {
                reject(new Error('pdf-lib did not load correctly'));
            }
        };
        script.onerror = () => reject(new Error('Failed to load pdf-lib'));
        document.head.appendChild(script);
    });
}

// Convert Uint8Array to base64 without stack overflow (chunked approach)
function uint8ArrayToBase64(bytes) {
    const chunkSize = 0x8000; // 32KB chunks
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
}

async function generatePersonalizedPetition(countyName) {
    try {
        const PDFLib = await loadPdfLib();
        const { PDFDocument, rgb, StandardFonts } = PDFLib;
        
        const existingPdfBytes = await fetch('/resources/petition.pdf').then(res => res.arrayBuffer());
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        
        const lineLeft = 2.5 * 72;
        const lineRight = 5.70 * 72;
        const lineWidth = lineRight - lineLeft;
        const countyY = (6 + 13.1/16) * 72;
        const maxHeight = (7) * 72 - countyY;
        
        let fontSize = maxHeight;
        let textWidth = font.widthOfTextAtSize(countyName, fontSize);
        
        while (textWidth > lineWidth && fontSize > 8) {
            fontSize -= 0.5;
            textWidth = font.widthOfTextAtSize(countyName, fontSize);
        }
        
        const centeredX = lineLeft + (lineWidth - textWidth) / 2;
        
        firstPage.drawText(countyName, {
            x: centeredX,
            y: countyY,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
        });
        
        const pdfBytes = await pdfDoc.save();
        
        // Convert to base64 using chunked approach (avoids stack overflow on large PDFs)
        const base64 = uint8ArrayToBase64(new Uint8Array(pdfBytes));
        const dataUrl = `data:application/pdf;base64,${base64}`;
        
        const safeCountyName = countyName.replace(/\s+/g, '-').toLowerCase();
        const filename = `ballot-petition-${safeCountyName}-county.pdf`;
        
        // Create download link and trigger
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return true;
    } catch (error) {
        console.error('PDF generation failed:', error);
        return false;
    }
}

window.generatePersonalizedPetition = generatePersonalizedPetition;
