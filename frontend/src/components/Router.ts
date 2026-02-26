import React, { useState, useCallback } from 'react';

type PageType = 'login' | 'register' | 'home' | 'garage' | 'maps' | 'leaderboard' | 'profile' | 'race' | 'editor' | 'party';

interface NavigateOptions {
  [key: string]: any;
}

let currentPage: PageType = 'login';
let navigationListeners: (() => void)[] = [];
let navigationParams: NavigateOptions = {};

export const useNavigate = () => {
  const [, setPageState] = React.useState(0);

  const navigate = useCallback((page: PageType, params?: NavigateOptions) => {
    currentPage = page;
    navigationParams = params || {};
    setPageState(prev => prev + 1);
    navigationListeners.forEach(listener => listener());
  }, []);

  return navigate;
};

export const usePage = () => {
  const [page, setPage] = React.useState(currentPage);

  React.useEffect(() => {
    const listener = () => setPage(currentPage);
    navigationListeners.push(listener);
    return () => {
      navigationListeners = navigationListeners.filter(l => l !== listener);
    };
  }, []);

  return page;
};

export const usePageParams = () => {
  const [params, setParams] = React.useState(navigationParams);

  React.useEffect(() => {
    const listener = () => setParams(navigationParams);
    navigationListeners.push(listener);
    return () => {
      navigationListeners = navigationListeners.filter(l => l !== listener);
    };
  }, []);

  return params;
};

export const getCurrentPage = () => currentPage;
export const getNavigationParams = () => navigationParams;
