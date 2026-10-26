/** Calendar dates, never locale-parsed instants. CSV contains no reliable locale/Excel epoch. */
export const dateFormats = [
  {value:'AUTO',label:'Auto Detect'},
  {value:'DMY',label:'DD-MM-YYYY (Indian) · also DD/MM/YYYY, D/M/YYYY, DD.MM.YYYY'},
  {value:'MDY',label:'MM-DD-YYYY (US) · also MM/DD/YYYY'},
  {value:'YMD',label:'YYYY-MM-DD (ISO) · also YYYY/MM/DD, YYYY.MM.DD, ISO 8601'},
  {value:'DMON',label:'DD-MMM-YYYY · English month names'},
  {value:'EXCEL1900',label:'Excel serial · 1900 date system'},
  {value:'EXCEL1904',label:'Excel serial · 1904 date system'},
] as const;
export type DateFormat = typeof dateFormats[number]['value'];
export function isDateFormat(value:unknown):value is DateFormat{return dateFormats.some(f=>f.value===value);}
const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function calendar(y:number,m:number,d:number){
 const leap=y%4===0&&(y%100!==0||y%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 if(!Number.isInteger(y)||y<1||y>9999||!Number.isInteger(m)||m<1||m>12||!Number.isInteger(d)||d<1||d>days[m-1])throw Error('INVALID_DATE');
 return `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
export function parseCsvDate(input:string,format:DateFormat='AUTO'):{iso:string;detected:string}{
 const v=input.trim();if(!v)return{iso:'',detected:'Empty (NULL)'};
 if(!isDateFormat(format))throw Error('INVALID_DATE_FORMAT');
 // Explicit year-first dates and ISO timestamps are unambiguous in every mode.
 const iso=/^(\d{4})([-/.])(\d{1,2})\2(\d{1,2})(.*)$/.exec(v);
 if(iso){
  const tail=iso[5];if(tail){
   if(iso[2]!=='-'||iso[3].length!==2||iso[4].length!==2)throw Error('INVALID_DATE');
   const time=/^T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|([+-])(\d{2}):?(\d{2}))?$/.exec(tail);
   if(!time||+time[1]>23||+time[2]>59||+(time[3]??0)>59||+(time[5]??0)>14||+(time[6]??0)>59||(+time[5]===14&&+time[6]!==0))throw Error('INVALID_DATE');
  }
  return{iso:calendar(+iso[1],+iso[3],+iso[4]),detected:tail?'ISO 8601 (written calendar date)':'YYYY-MM-DD / YYYY/MM/DD / YYYY.MM.DD'};
 }
 const named=/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(v);
 if(named){const month=months.findIndex(m=>m.toLowerCase()===named[2].toLowerCase())+1;return{iso:calendar(+named[3],month,+named[1]),detected:'DD-MMM-YYYY'};}
 if(/^\d+(?:\.\d+)?$/.test(v)){
  if(format!=='EXCEL1900'&&format!=='EXCEL1904')throw Error('EXCEL_DATE_SYSTEM_REQUIRED');
  const day=Math.floor(Number(v));if(!Number.isSafeInteger(day)||day< (format==='EXCEL1900'?1:0)||day>2958465||(format==='EXCEL1900'&&day===60))throw Error('INVALID_DATE');
  const base=Date.UTC(format==='EXCEL1900'?1899:1904,format==='EXCEL1900'?11:0,format==='EXCEL1900'?31:1);
  const date=new Date(base+(day-(format==='EXCEL1900'&&day>60?1:0))*86400000);
  return{iso:calendar(date.getUTCFullYear(),date.getUTCMonth()+1,date.getUTCDate()),detected:`Excel ${format==='EXCEL1900'?'1900':'1904'} (calendar day)`};
 }
 const numeric=/^(\d{1,2})([-/.])(\d{1,2})\2(\d{4})$/.exec(v);
 if(!numeric)throw Error('INVALID_DATE');
 const a=+numeric[1],b=+numeric[3],y=+numeric[4];let order=format;
 if(order==='AUTO'){
  if(a>=1&&a<=12&&b>=1&&b<=12&&a!==b)throw Error('AMBIGUOUS_DATE');
  order=a>12?'DMY':b>12?'MDY':'DMY';
 }
 if(order!=='DMY'&&order!=='MDY')throw Error('DATE_FORMAT_MISMATCH');
 return{iso:calendar(y,order==='DMY'?b:a,order==='DMY'?a:b),detected:order==='DMY'?'DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY':'MM-DD-YYYY / MM/DD/YYYY'};
}
export function normalizeDateRows<T extends {'Date of Birth':string}>(rows:readonly T[],format:DateFormat='AUTO'){
 const errors:{row:number;code:string}[]=[],detected=new Set<string>(),samples:{row:number;source:string;iso:string}[]=[];
 const normalized=rows.map((row,index)=>{try{const date=parseCsvDate(row['Date of Birth'],format);if(row['Date of Birth']){detected.add(date.detected);if(samples.length<3)samples.push({row:index+1,source:row['Date of Birth'],iso:date.iso});}return{...row,'Date of Birth':date.iso};}catch(e){errors.push({row:index+1,code:e instanceof Error?e.message:'INVALID_DATE'});return{...row};}});
 return{rows:normalized,errors,detected:[...detected],samples};
}
export const exportDateFormats=[{value:'ISO',label:'YYYY-MM-DD (ISO)'},{value:'DMY',label:'DD-MM-YYYY (Indian)'},{value:'MDY',label:'MM-DD-YYYY (US)'},{value:'DMON',label:'DD-MMM-YYYY'}] as const;
export type ExportDateFormat=typeof exportDateFormats[number]['value'];
export function displayCsvDate(value:string,format:ExportDateFormat='ISO'){
 if(!value)return '';const iso=parseCsvDate(value,'YMD').iso;const [y,m,d]=iso.split('-');
 if(format==='DMY')return `${d}-${m}-${y}`;if(format==='MDY')return `${m}-${d}-${y}`;if(format==='DMON')return `${d}-${months[+m-1]}-${y}`;return iso;
}
