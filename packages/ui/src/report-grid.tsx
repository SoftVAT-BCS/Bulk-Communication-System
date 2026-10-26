"use client";
import {useEffect,useMemo,useState} from 'react';
import {EnterpriseGrid,type GridColumn} from './grid';
import {ActionButton} from './primitives';
export type ReportRow = {id:string; [key:string]:string|number};
/** Client-side adapter for bounded report datasets; the shared grid remains the renderer. */
export function ReportGrid({label,rows,columns,filterKeys=[],loading=false,error='',onDetail}:{label:string;rows:ReportRow[];columns:GridColumn<ReportRow>[];filterKeys?:string[];loading?:boolean;error?:string;onDetail?(row:ReportRow):void}){
 const [filtersOpen,setFiltersOpen]=useState(true);
 useEffect(()=>{if(typeof window.matchMedia!=='function')return;const media=window.matchMedia('(max-width:600px)'),change=()=>setFiltersOpen(!media.matches);change();media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 const [search,setSearch]=useState(''),[filters,setFilters]=useState<Record<string,string>>({}),[sort,setSort]=useState(''),[descending,setDescending]=useState(false),[page,setPage]=useState(0),[size,setSize]=useState(20),[visible,setVisible]=useState(columns.map(c=>c.key));
 const filtered=useMemo(()=>rows.filter(r=>(!search||Object.values(r).some(v=>String(v).toLowerCase().includes(search.toLowerCase())))&&Object.entries(filters).every(([k,v])=>!v||String(r[k])===v)).sort((a,b)=>{const x=a[sort],y=b[sort];return (typeof x==='number'&&typeof y==='number'?x-y:String(x??'').localeCompare(String(y??''),undefined,{numeric:true}))*(descending?-1:1);}),[rows,search,filters,sort,descending]);
 const current=Math.min(page,Math.max(0,Math.ceil(filtered.length/size)-1));
 return <section className="bcs-report-grid" aria-label={label} aria-busy={loading}>
  <div className="bcs-report-tools"><label>Search {label}<input className="input" type="search" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></label>{filterKeys.length>0&&<ActionButton aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(!filtersOpen)}>Filters</ActionButton>}{filtersOpen&&filterKeys.map(key=><label key={key}>{columns.find(c=>c.key===key)?.label??key} filter<select className="select" value={filters[key]??''} onChange={e=>{setFilters({...filters,[key]:e.target.value});setPage(0);}}><option value="">All</option>{[...new Set(rows.map(r=>String(r[key]??'')))].filter(Boolean).sort().map(v=><option key={v}>{v}</option>)}</select></label>)}<ActionButton onClick={()=>{setSearch('');setFilters({});setPage(0);}}>Clear filters</ActionButton><span className="tiny">{filtered.length} filtered / {rows.length} total</span></div>
  {error&&<p role="alert">{error}</p>}
  <EnterpriseGrid selectionMode="none" recordNoun="rows" pageSizes={[10,20,50,100]} showDetails={Boolean(onDetail)} rows={filtered.slice(current*size,(current+1)*size)} columns={columns} visibleColumns={visible} onColumnsChange={setVisible} selected={new Set()} eligible={()=>false} onSelect={()=>{}} onSelectMatching={()=>{}} onClear={()=>{}} total={filtered.length} eligibleCount={0} page={current} pageSize={size} onPage={setPage} onPageSize={n=>{setSize(n);setPage(0);}} sort={sort} descending={descending} onSort={key=>{setSort(key);setDescending(sort===key?!descending:false);setPage(0);}} onDetail={r=>onDetail?.(r)} emptyMessage={loading?'Loading records…':error?'Records unavailable.':'No rows match these filters.'}/>
 </section>;
}
