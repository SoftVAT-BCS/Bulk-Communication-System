import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import {EnterpriseGrid} from '@bcs/ui';
it('report grid hides recipient selection while retaining sorting, details and paging',()=>{
 const select=vi.fn(),sort=vi.fn(),detail=vi.fn(),page=vi.fn();
 render(<EnterpriseGrid selectionMode="none" recordNoun="records" rows={[{id:'job1',title:'Test queue'}]} columns={[{key:'title',label:'Title',sortable:true,render:r=>r.title}]} visibleColumns={['title']} onColumnsChange={()=>{}} selected={new Set()} eligible={()=>false} onSelect={select} onSelectMatching={select} onClear={select} total={11} eligibleCount={0} page={0} pageSize={10} onPage={page} onPageSize={()=>{}} sort="title" descending={false} onSort={sort} onDetail={detail} />);
 expect(screen.queryByRole('checkbox')).toBeNull();
 expect(screen.queryByRole('button',{name:/Select page/})).toBeNull();
 expect(screen.queryByRole('button',{name:/Clear all selection/})).toBeNull();
 expect(screen.getByRole('region',{name:'Report results'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:/Title/}));expect(sort).toHaveBeenCalledWith('title');
 fireEvent.click(screen.getByRole('button',{name:'Details for job1'}));expect(detail).toHaveBeenCalledWith({id:'job1',title:'Test queue'});
 fireEvent.click(screen.getByRole('button',{name:'Next'}));expect(page).toHaveBeenCalledWith(1);
 expect(select).not.toHaveBeenCalled();
});
