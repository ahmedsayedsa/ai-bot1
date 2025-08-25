import QRCode from 'qrcode';
import { getWhatsAppSession, updateWhatsAppSession } from './firestoreService.js';
import logger from '../utils/logger.js';

export const generateQRCode = async (userId, isAdmin = false) => {
  try {
    // إنشاء QR code مؤقت - في التطبيق الحقيقي سيكون من WhatsApp Web API
    const qrData = isAdmin ? 
      `whatsapp-admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` :
      `whatsapp-user-${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // حفظ session data
    if (!isAdmin) {
      await updateWhatsAppSession(userId, {
        deviceStatus: 'waiting_for_scan',
        qrImageDataURL: qrCodeDataURL,
        sessionMeta: {
          qrData,
          generatedAt: new Date()
        }
      });
    }

    return qrCodeDataURL;
  } catch (error) {
    logger.error('Error generating QR code:', error);
    throw error;
  }
};

export const getDeviceStatus = async (userId) => {
  try {
    const session = await getWhatsAppSession(userId);
    
    if (!session) {
      return {
        status: 'disconnected',
        lastSync: null
      };
    }

    // محاكاة حالة الجهاز - في التطبيق الحقيقي سيكون من WhatsApp API
    const statuses = ['online', 'offline', 'waiting_for_scan'];
    const randomStatus = session.deviceStatus || statuses[Math.floor(Math.random() * statuses.length)];

    return {
      status: randomStatus,
      lastSync: session.lastSyncAt,
      qrCode: session.qrImageDataURL
    };
  } catch (error) {
    logger.error('Error getting device status:', error);
    throw error;
  }
};

export const linkDevice = async (userId, deviceInfo) => {
  try {
    await updateWhatsAppSession(userId, {
      deviceStatus: 'online',
      sessionMeta: {
        deviceInfo,
        linkedAt: new Date()
      }
    });

    return true;
  } catch (error) {
    logger.error('Error linking device:', error);
    throw error;
  }
};