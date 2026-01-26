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

async function generatePersonalizedPetition(countyName, pdfWindow = null) {
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
        
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const safeCountyName = countyName.replace(/\s+/g, '-').toLowerCase();
        const filename = `ballot-petition-${safeCountyName}-county.pdf`;
        const url = URL.createObjectURL(blob);
        
        // If we have a pre-opened window, navigate it to the PDF
        if (pdfWindow && !pdfWindow.closed) {
            pdfWindow.location.href = url;
        } else {
            // Fallback: try download link (works in most browsers)
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        
        // Clean up after delay
        setTimeout(() => URL.revokeObjectURL(url), 30000);
        
        return true;
    } catch (error) {
        console.error('PDF generation failed:', error);
        // Close the pre-opened window if generation failed
        if (pdfWindow && !pdfWindow.closed) {
            pdfWindow.close();
        }
        return false;
    }
}

window.generatePersonalizedPetition = generatePersonalizedPetition;

