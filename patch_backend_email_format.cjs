const fs = require('fs');
let code = fs.readFileSync('backend/Code.js', 'utf8');

const searchHtml = `    const htmlBody = \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2563eb;">\${titleText}</h2>
        <p>\${customIntro}</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          \${store.paynowNumber && !isUpdate ? 
            \\\`<div style="text-align: center; margin-bottom: 20px; background: white; padding: 15px; border-radius: 8px; border: 2px solid #6b21a8;">
                <h3 style="margin-top: 0; color: #6b21a8;">Complete Your Payment</h3>
                <p style="margin: 5px 0; font-size: 14px; color: #555;">Scan the QR code below to pay <strong>\${totalAmount.toFixed(2)}</strong></p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=\${encodeURIComponent(generatePayNowString(store.paynowNumber, totalAmount, orderId))}" alt="PayNow QR Code" style="width: 200px; height: 200px; margin: 10px 0;" />
                <p style="margin: 5px 0; font-size: 14px;"><strong>Pay To:</strong> \${store.paynowNumber}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Reference:</strong> \${orderId}</p>
                <p style="margin: 15px 0 5px 0; font-size: 14px; color: #b91c1c; font-weight: bold;">Important:</p>
                <p style="margin: 5px 0; font-size: 14px; color: #333;">After paying, please WhatsApp your successful payment screenshot to <strong>\${store.paynowNumber}</strong>.</p>
            </div>\\\` 
          : ''}
          <p style="margin: 5px 0;"><strong>Order ID:</strong> \${orderId}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #2563eb; color: white;">
              <th style="padding: 8px; text-align: left;">Item</th>
              <th style="padding: 8px; text-align: left;">Price</th>
              <th style="padding: 8px; text-align: left;">Qty</th>
              <th style="padding: 8px; text-align: left;">Subtotal</th>
            </tr>
          </thead>
          <tbody>\${itemListHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Total:</td>
              <td style="padding: 10px; font-weight: bold; color: #2563eb;">$\${parseFloat(totalAmount).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        <p style="font-size: 12px; color: #666;">\${customFooter}</p>
      </div>
    \`;`;

const newHtml = `    const htmlBody = \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2563eb; margin-bottom: 5px;">\${titleText}</h2>
        <p style="margin-top: 0; font-weight: bold; font-size: 16px;">Order No: \${orderId}</p>
        <p>\${customIntro}</p>

        <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px; color: #444; margin-top: 30px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #2563eb; color: white;">
              <th style="padding: 8px; text-align: left;">Item</th>
              <th style="padding: 8px; text-align: left;">Price</th>
              <th style="padding: 8px; text-align: left;">Qty</th>
              <th style="padding: 8px; text-align: left;">Subtotal</th>
            </tr>
          </thead>
          <tbody>\${itemListHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold; border-top: 2px solid #ccc;">Total:</td>
              <td style="padding: 10px; font-weight: bold; color: #2563eb; border-top: 2px solid #ccc;">$\${parseFloat(totalAmount).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        \${store.paynowNumber && !isUpdate ? 
            \\\`<div style="text-align: center; margin-bottom: 20px; background: #f9fafb; padding: 20px; border-radius: 8px; border: 2px dashed #ccc;">
                <p style="font-size: 13px; font-weight: bold; color: #b91c1c; text-transform: uppercase; margin-top: 0; line-height: 1.4;">
                  IF YOU HAVE ALREADY MADE PAYMENT AND SUBMITTED THE SCREENSHOT VIA THE ONLINE STORE. IGNORE THE QR CODE BELOW.
                </p>
                <p style="font-size: 13px; font-weight: bold; color: #047857; text-transform: uppercase; margin-bottom: 20px; line-height: 1.4;">
                  BUT IF NOT MADE PAYMENT YET USE THE QR CODE BELOW AND FOLLOW THE INSTRUCTIONS:
                </p>
                
                <h3 style="margin-top: 0; color: #6b21a8;">Complete Your Payment</h3>
                <p style="margin: 5px 0; font-size: 14px; color: #555;">Scan the QR code below to pay <strong>$\${totalAmount.toFixed(2)}</strong></p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=\${encodeURIComponent(generatePayNowString(store.paynowNumber, totalAmount, orderId))}" alt="PayNow QR Code" style="width: 200px; height: 200px; margin: 10px 0;" />
                <p style="margin: 5px 0; font-size: 14px;"><strong>Pay To:</strong> \${store.paynowNumber}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Reference:</strong> \${orderId}</p>
                <p style="margin: 15px 0 5px 0; font-size: 14px; color: #b91c1c; font-weight: bold;">Important:</p>
                <p style="margin: 5px 0; font-size: 14px; color: #333;">After paying, please WhatsApp your successful payment screenshot to <strong>\${store.paynowNumber}</strong>.</p>
            </div>\\\` 
          : ''}
          
        <p style="font-size: 12px; color: #666; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px;">\${customFooter}</p>
      </div>
    \`;`;

code = code.replace(searchHtml, newHtml);
fs.writeFileSync('backend/Code.js', code);
