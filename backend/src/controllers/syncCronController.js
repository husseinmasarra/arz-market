const db = require('../config/db');
const { syncAbdulGhani } = require('../utils/abdulghani_sync_service');
const { syncDealCom } = require('../utils/deal_sync_service');
const { syncDrPhone } = require('../utils/drphone_sync_service');

let isSyncRunning = false;

exports.runCronSync = async (req, res) => {
  if (isSyncRunning) {
    return res.status(429).json({
      message: 'Sync job is already in progress.',
      status: 'busy'
    });
  }

  try {
    isSyncRunning = true;
    const startTime = new Date();
    console.log(`[CronSync] Starting automated daily catalog sync at ${startTime.toISOString()}...`);

    const summary = {
      abdulGhani: null,
      deal: null,
      drPhone: null
    };

    // 1. Sync Abdul Ghani Trading (First 15 most active/recent pages for fast daily refresh)
    try {
      if (syncAbdulGhani) {
        summary.abdulGhani = await syncAbdulGhani({ maxPages: 15, vatPercent: 12 });
      }
    } catch (e) {
      summary.abdulGhani = { error: e.message };
    }

    // 2. Sync Deal.com.lb (First 10 pages)
    try {
      if (syncDealCom) {
        summary.deal = await syncDealCom({ maxPages: 10 });
      }
    } catch (e) {
      summary.deal = { error: e.message };
    }

    // 3. Sync DrPhone
    try {
      if (syncDrPhone) {
        summary.drPhone = await syncDrPhone();
      }
    } catch (e) {
      summary.drPhone = { error: e.message };
    }

    const durationSeconds = Math.round((new Date() - startTime) / 1000);
    const agtSynced = summary.abdulGhani?.totalProcessed || 0;
    const dealSynced = summary.deal?.totalProcessed || 0;
    const drPhoneSynced = summary.drPhone?.totalProcessed || 0;
    const totalSynced = agtSynced + dealSynced + drPhoneSynced;

    const statusText = `تمت المزامنة الآلية بنجاح: ${totalSynced} منتج (AGT: ${agtSynced}, Deal: ${dealSynced}, DrPhone: ${drPhoneSynced}) في ${durationSeconds} ثانية`;

    await db.runAsync(`
      UPDATE settings 
      SET last_sync_time = NOW(), last_sync_status = ?
      WHERE id = 1 OR id = (SELECT id FROM settings ORDER BY id DESC LIMIT 1)
    `, [statusText]);

    isSyncRunning = false;

    res.json({
      success: true,
      duration_seconds: durationSeconds,
      summary,
      status: statusText
    });
  } catch (err) {
    isSyncRunning = false;
    console.error('[CronSync] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
