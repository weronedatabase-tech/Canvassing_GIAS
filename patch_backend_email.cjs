const fs = require('fs');
let code = fs.readFileSync('backend/Code.js', 'utf8');

const qrFunc = `
function generatePayNowString(proxyValue, amount, ref) {
    const tlv = (tag, val) => {
        const v = String(val);
        const l = v.length.toString().padStart(2, '0');
        return \`\${tag}\${l}\${v}\`;
    };
    
    let proxyType = '0';
    let formattedProxy = (proxyValue || '').trim();
    if (formattedProxy.length === 8 && /^\\d+$/.test(formattedProxy)) {
        formattedProxy = '+65' + formattedProxy;
    } else if (formattedProxy.length >= 9 && !formattedProxy.startsWith('+')) {
        proxyType = '2'; // UEN
    }
    
    let payload = tlv('00', '01') + tlv('01', '12'); 
    
    let accInfo = tlv('00', 'SG.PAYNOW') + tlv('01', proxyType) + tlv('02', formattedProxy) + tlv('03', '1');
    payload += tlv('26', accInfo) + tlv('52', '0000') + tlv('53', '702');
    
    if (amount && parseFloat(amount) > 0) {
        payload += tlv('54', parseFloat(amount).toFixed(2));
    }
    
    payload += tlv('58', 'SG') + tlv('59', 'NA') + tlv('60', 'Singapore');
    
    if (ref) payload += tlv('62', tlv('01', ref));
    payload += '6304'; 
    
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= (payload.charCodeAt(i) << 8);
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    crc = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    return payload + crc;
}
`;

// Insert qrFunc at the bottom of the file
if (!code.includes('generatePayNowString(')) {
    code += '\n' + qrFunc;
}

// Now patch _sendOrderEmail
const searchEmail = `        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Order ID:</strong> \${orderId}</p>`;

const replaceEmail = `        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          \${store.paynowNumber && !isUpdate ? 
            \`<div style="text-align: center; margin-bottom: 20px; background: white; padding: 15px; border-radius: 8px; border: 2px solid #6b21a8;">
                <h3 style="margin-top: 0; color: #6b21a8;">Complete Your Payment</h3>
                <p style="margin: 5px 0; font-size: 14px; color: #555;">Scan the QR code below to pay <strong>$\${totalAmount.toFixed(2)}</strong></p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=\${encodeURIComponent(generatePayNowString(store.paynowNumber, totalAmount, orderId))}" alt="PayNow QR Code" style="width: 200px; height: 200px; margin: 10px 0;" />
                <p style="margin: 5px 0; font-size: 14px;"><strong>Pay To:</strong> \${store.paynowNumber}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Reference:</strong> \${orderId}</p>
                <p style="margin: 15px 0 5px 0; font-size: 14px; color: #b91c1c; font-weight: bold;">Important:</p>
                <p style="margin: 5px 0; font-size: 14px; color: #333;">After paying, please WhatsApp your successful payment screenshot to <strong>\${store.paynowNumber}</strong>.</p>
            </div>\` 
          : ''}
          <p style="margin: 5px 0;"><strong>Order ID:</strong> \${orderId}</p>`;

code = code.replace(searchEmail, replaceEmail);

fs.writeFileSync('backend/Code.js', code);
