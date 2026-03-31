import React, { useState, useMemo } from 'react';
import { Search, Check, Globe } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';

const PageSelector = ({ pages, selectedPages, onSelectionChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const allSelected = pages.length > 0 && selectedPages.length === pages.length;
  
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) return pages;
    return pages.filter(p => 
      p.page_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [pages, searchQuery]);

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(pages.map(p => p.page_id));
    }
  };
  
  const handlePageToggle = (pageId) => {
    if (selectedPages.includes(pageId)) {
      onSelectionChange(selectedPages.filter(id => id !== pageId));
    } else {
      onSelectionChange([...selectedPages, pageId]);
    }
  };
  
  if (!pages || pages.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
          <Globe className="w-6 h-6 text-zinc-500" />
        </div>
        <p className="text-sm text-zinc-400">No pages available</p>
        <p className="text-xs text-zinc-600 mt-1">Connect a Facebook account first</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4" data-testid="page-selector">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Pages</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">All</span>
          <Switch
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            data-testid="select-all-pages-toggle"
            className="data-[state=checked]:bg-blue-500"
          />
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search pages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="page-search-input"
          className="w-full pl-9 pr-4 py-2.5 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 outline-none transition-all"
        />
      </div>
      
      <ScrollArea className="max-h-[340px]">
        <div className="space-y-2 pr-2">
          {filteredPages.map((page) => {
            const isSelected = selectedPages.includes(page.page_id);
            return (
              <button
                key={page.page_id}
                onClick={() => handlePageToggle(page.page_id)}
                data-testid={`page-card-${page.page_id}`}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 text-left group ${
                  isSelected
                    ? 'border-blue-500/50 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.12)]'
                    : 'border-white/10 bg-[#1a1a1a] hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <div className="relative flex-shrink-0">
                  {page.picture_url ? (
                    <img 
                      src={page.picture_url} 
                      alt={page.page_name}
                      className="w-10 h-10 rounded-full object-cover border border-white/20"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                      {page.page_name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#121212] ${
                    isSelected ? 'bg-emerald-400' : 'bg-zinc-600'
                  }`} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{page.page_name}</p>
                  {page.category && (
                    <p className="text-xs text-zinc-500 truncate">{page.category}</p>
                  )}
                </div>

                <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                  isSelected 
                    ? 'bg-blue-500 border-blue-500' 
                    : 'border-white/20 group-hover:border-white/40'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
      
      {selectedPages.length > 0 && (
        <div className="pt-3 border-t border-white/10">
          <p className="text-xs text-zinc-400">
            <span className="font-semibold text-blue-400">{selectedPages.length}</span> of {pages.length} page{pages.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  );
};

export default PageSelector;
