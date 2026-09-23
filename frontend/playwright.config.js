import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',timeout:60000,workers:1,reporter:'list',use:{baseURL:'http://localhost:5173',headless:true,viewport:{width:1440,height:960},reducedMotion:'reduce',screenshot:'only-on-failure'}});
