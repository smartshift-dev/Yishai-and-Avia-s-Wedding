# ישי ואביה: דף החתונה

צד הלקוח ב-Angular (התיקייה `client/`), והשרת ב-Node עם Express (התיקייה `server/`).

## הרצה מקומית

```powershell
npm run install:all
npm run build                      # בונה את Angular לתיקייה client/dist
$env:ADMIN_PASSWORD = "<סיסמה>"
npm start                          # http://localhost:3000
```

בזמן פיתוח מריצים את `npm run dev:server` ואת `npm run dev:client`. האתר נפתח בכתובת http://localhost:4200, והבקשות לשרת עוברות דרך proxy.

## הגדרות

| משתנה | משמעות |
|---|---|
| `ADMIN_PASSWORD` | הסיסמה לכניסת בעלי השמחה בכתובת `/admin`. בלעדיה אי אפשר להיכנס. |
| `PORT` | ברירת מחדל: 3000 |
| `DATA_DIR` | איפה נשמרים מסד הנתונים וההקלטות בהרצה מקומית. ברירת מחדל: `server/data` |
| `COOKIE_SECRET` | חובה בסביבת הייצור. בהרצה מקומית, אם הוא לא מוגדר, נוצר אחד ונשמר ב-`DATA_DIR`. |
| `NODE_ENV=production` | העוגיות מסומנות `Secure`, ולכן צריך HTTPS. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | כשהם מוגדרים, הנתונים נשמרים ב-Supabase ולא על הדיסק. |

כל פרטי האירוע (שעה, מקום ותאריכים) נמצאים בקובץ [shared/event.json](shared/event.json).

## זיהוי והרשאות

- כל דפדפן מקבל מהשרת עוגייה אנונימית וחתומה בשם `gid`. אורח יכול לערוך או למחוק רק את הברכה שנשמרה תחת המזהה שלו, והשרת אוכף את זה.
- בעלי השמחה נכנסים בכתובת `/admin` עם סיסמה ומקבלים עוגייה חתומה. רק הם יכולים למחוק ברכה של מישהו אחר (`DELETE /api/wishes/:id`).
- עדכונים ברשימת הברכות נשלחים לכל המבקרים בזמן אמת, ב-SSE (`/api/wishes/stream`).

## אחסון

- **בהרצה מקומית** (בלי `SUPABASE_URL`): הברכות נשמרות ב-SQLite בקובץ `server/data/wedding.db`, וההקלטות בתיקייה `server/data/audio`.
- **בסביבת הייצור**: Supabase. הברכות נשמרות בטבלה `wishes`, וההקלטות ב-bucket ציבורי בשם `audio` ב-Storage. סקריפט ההקמה: [supabase/schema.sql](supabase/schema.sql). השרת ניגש עם מפתח ה-service-role, ו-RLS חוסם את כל השאר.

## העלאה לאוויר בחינם: Render + Supabase

1. **Supabase:** פותחים פרויקט ומריצים את [supabase/schema.sql](supabase/schema.sql) ב-SQL Editor. אחר כך, ב-Project Settings ואז API, מעתיקים את ה-`Project URL` ואת מפתח ה-`service_role`.
2. **GitHub:** מעלים את הקוד למאגר.
3. **Render:** בוחרים New, אחר כך Blueprint, ובוחרים את המאגר. Render קורא את הקובץ [render.yaml](render.yaml) ומבקש את `ADMIN_PASSWORD`, `SUPABASE_URL` ו-`SUPABASE_SERVICE_ROLE_KEY`. את `COOKIE_SECRET` הוא יוצר לבד. אסור לשנות אותו אחר כך, אחרת האורחים יאבדו את הקישור לברכות שלהם.
4. **שמירה על ערנות:** השרת החינמי של Render נרדם אחרי 15 דקות בלי מבקרים. ב-[cron-job.org](https://cron-job.org) מגדירים קריאה לכתובת `https://<הכתובת>.onrender.com/api/health` כל 10 דקות. זה גם מונע מפרויקט ה-Supabase להיות מושהה.

כל דחיפה (push) לענף `main` מעלה את האתר מחדש באופן אוטומטי.
