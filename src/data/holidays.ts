export type HolidayEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  states: string[] | "all";
  type: "national" | "state" | "manual";
};

export const INDIAN_HOLIDAYS: HolidayEntry[] = [
  // ==================== NATIONAL HOLIDAYS ====================
  // 2025
  { id: "national_republic_day_2025", date: "2025-01-26", name: "Republic Day", states: "all", type: "national" },
  { id: "national_independence_day_2025", date: "2025-08-15", name: "Independence Day", states: "all", type: "national" },
  { id: "national_gandhi_jayanti_2025", date: "2025-10-02", name: "Gandhi Jayanti", states: "all", type: "national" },
  { id: "national_christmas_2025", date: "2025-12-25", name: "Christmas", states: "all", type: "national" },
  { id: "national_new_year_2025", date: "2025-01-01", name: "New Year", states: "all", type: "national" },

  // 2026
  { id: "national_republic_day_2026", date: "2026-01-26", name: "Republic Day", states: "all", type: "national" },
  { id: "national_independence_day_2026", date: "2026-08-15", name: "Independence Day", states: "all", type: "national" },
  { id: "national_gandhi_jayanti_2026", date: "2026-10-02", name: "Gandhi Jayanti", states: "all", type: "national" },
  { id: "national_christmas_2026", date: "2026-12-25", name: "Christmas", states: "all", type: "national" },
  { id: "national_new_year_2026", date: "2026-01-01", name: "New Year", states: "all", type: "national" },

  // 2027
  { id: "national_republic_day_2027", date: "2027-01-26", name: "Republic Day", states: "all", type: "national" },
  { id: "national_independence_day_2027", date: "2027-08-15", name: "Independence Day", states: "all", type: "national" },
  { id: "national_gandhi_jayanti_2027", date: "2027-10-02", name: "Gandhi Jayanti", states: "all", type: "national" },
  { id: "national_christmas_2027", date: "2027-12-25", name: "Christmas", states: "all", type: "national" },
  { id: "national_new_year_2027", date: "2027-01-01", name: "New Year", states: "all", type: "national" },

  // ==================== HINDU FESTIVALS ====================
  // 2025
  { id: "hindu_makar_sankranti_2025", date: "2025-01-14", name: "Makar Sankranti", states: "all", type: "national" },
  { id: "hindu_holi_2025", date: "2025-03-14", name: "Holi", states: "all", type: "national" },
  { id: "hindu_ram_navami_2025", date: "2025-03-29", name: "Ram Navami", states: "all", type: "national" },
  { id: "hindu_good_friday_2025", date: "2025-04-18", name: "Good Friday", states: "all", type: "national" },
  { id: "hindu_mahavir_jayanti_2025", date: "2025-04-21", name: "Mahavir Jayanti", states: "all", type: "national" },
  { id: "hindu_ganesh_chaturthi_2025", date: "2025-08-27", name: "Ganesh Chaturthi", states: ["Maharashtra", "Karnataka", "Telangana", "Andhra Pradesh"], type: "state" },
  { id: "hindu_navratri_start_2025", date: "2025-10-02", name: "Navratri (Durga Puja)", states: ["West Bengal", "Assam", "Odisha"], type: "state" },
  { id: "hindu_dussehra_2025", date: "2025-10-12", name: "Dussehra", states: "all", type: "national" },
  { id: "hindu_diwali_2025", date: "2025-10-29", name: "Diwali", states: "all", type: "national" },
  { id: "hindu_diwali_next_day_2025", date: "2025-10-30", name: "Diwali (Day 2)", states: ["Maharashtra"], type: "state" },
  { id: "hindu_janmashtami_2025", date: "2025-08-16", name: "Janmashtami", states: ["Maharashtra", "Gujarat", "Uttar Pradesh", "Delhi"], type: "state" },

  // 2026
  { id: "hindu_makar_sankranti_2026", date: "2026-01-14", name: "Makar Sankranti", states: "all", type: "national" },
  { id: "hindu_holi_2026", date: "2026-03-29", name: "Holi", states: "all", type: "national" },
  { id: "hindu_ram_navami_2026", date: "2026-04-14", name: "Ram Navami", states: "all", type: "national" },
  { id: "hindu_good_friday_2026", date: "2026-04-03", name: "Good Friday", states: "all", type: "national" },
  { id: "hindu_mahavir_jayanti_2026", date: "2026-04-06", name: "Mahavir Jayanti", states: "all", type: "national" },
  { id: "hindu_ganesh_chaturthi_2026", date: "2026-09-15", name: "Ganesh Chaturthi", states: ["Maharashtra", "Karnataka", "Telangana", "Andhra Pradesh"], type: "state" },
  { id: "hindu_dussehra_2026", date: "2026-10-02", name: "Dussehra", states: "all", type: "national" },
  { id: "hindu_diwali_2026", date: "2026-10-20", name: "Diwali", states: "all", type: "national" },
  { id: "hindu_janmashtami_2026", date: "2026-09-04", name: "Janmashtami", states: ["Maharashtra", "Gujarat", "Uttar Pradesh", "Delhi"], type: "state" },

  // ==================== MUSLIM FESTIVALS ====================
  // 2025
  { id: "muslim_eid_ul_fitr_2025", date: "2025-03-30", name: "Eid ul-Fitr", states: "all", type: "national" },
  { id: "muslim_eid_ul_adha_2025", date: "2025-06-07", name: "Eid ul-Adha", states: "all", type: "national" },
  { id: "muslim_muharram_2025", date: "2025-07-17", name: "Muharram", states: "all", type: "national" },
  { id: "muslim_milad_un_nabi_2025", date: "2025-09-16", name: "Milad-un-Nabi (Prophet's Birthday)", states: "all", type: "national" },

  // 2026
  { id: "muslim_eid_ul_fitr_2026", date: "2026-03-19", name: "Eid ul-Fitr", states: "all", type: "national" },
  { id: "muslim_eid_ul_adha_2026", date: "2026-05-27", name: "Eid ul-Adha", states: "all", type: "national" },
  { id: "muslim_muharram_2026", date: "2026-07-06", name: "Muharram", states: "all", type: "national" },
  { id: "muslim_milad_un_nabi_2026", date: "2026-09-05", name: "Milad-un-Nabi (Prophet's Birthday)", states: "all", type: "national" },

  // ==================== CHRISTIAN HOLIDAYS ====================
  // 2025
  { id: "christian_good_friday_2025", date: "2025-04-18", name: "Good Friday", states: "all", type: "national" },
  { id: "christian_easter_2025", date: "2025-04-20", name: "Easter Sunday", states: ["Tamil Nadu", "Kerala"], type: "state" },

  // 2026
  { id: "christian_good_friday_2026", date: "2026-04-03", name: "Good Friday", states: "all", type: "national" },
  { id: "christian_easter_2026", date: "2026-04-05", name: "Easter Sunday", states: ["Tamil Nadu", "Kerala"], type: "state" },

  // ==================== SIKH HOLIDAYS ====================
  // 2025
  { id: "sikh_guru_nanak_jayanti_2025", date: "2025-12-07", name: "Guru Nanak Jayanti", states: ["Punjab", "Delhi"], type: "state" },
  { id: "sikh_baisakhi_2025", date: "2025-04-13", name: "Baisakhi", states: ["Punjab", "Haryana", "Himachal Pradesh"], type: "state" },

  // 2026
  { id: "sikh_guru_nanak_jayanti_2026", date: "2026-11-28", name: "Guru Nanak Jayanti", states: ["Punjab", "Delhi"], type: "state" },
  { id: "sikh_baisakhi_2026", date: "2026-04-13", name: "Baisakhi", states: ["Punjab", "Haryana", "Himachal Pradesh"], type: "state" },

  // ==================== TELANGANA STATE HOLIDAYS ====================
  { id: "telangana_formation_day_2025", date: "2025-06-02", name: "Telangana Formation Day", states: ["Telangana"], type: "state" },
  { id: "telangana_formation_day_2026", date: "2026-06-02", name: "Telangana Formation Day", states: ["Telangana"], type: "state" },

  // ==================== ANDHRA PRADESH STATE HOLIDAYS ====================
  { id: "ap_ugadi_2025", date: "2025-03-30", name: "Ugadi (Telugu New Year)", states: ["Andhra Pradesh", "Telangana"], type: "state" },
  { id: "ap_ugadi_2026", date: "2026-03-19", name: "Ugadi (Telugu New Year)", states: ["Andhra Pradesh", "Telangana"], type: "state" },

  // ==================== MAHARASHTRA STATE HOLIDAYS ====================
  { id: "maharashtra_shiv_jayanti_2025", date: "2025-02-19", name: "Shiv Jayanti", states: ["Maharashtra"], type: "state" },
  { id: "maharashtra_shiv_jayanti_2026", date: "2026-02-19", name: "Shiv Jayanti", states: ["Maharashtra"], type: "state" },
  { id: "maharashtra_ambedkar_jayanti_2025", date: "2025-04-14", name: "Dr. Ambedkar Jayanti", states: ["Maharashtra"], type: "state" },
  { id: "maharashtra_ambedkar_jayanti_2026", date: "2026-04-14", name: "Dr. Ambedkar Jayanti", states: ["Maharashtra"], type: "state" },

  // ==================== KARNATAKA STATE HOLIDAYS ====================
  { id: "karnataka_rajyotsava_2025", date: "2025-11-01", name: "Karnataka Rajyotsava", states: ["Karnataka"], type: "state" },
  { id: "karnataka_rajyotsava_2026", date: "2026-11-01", name: "Karnataka Rajyotsava", states: ["Karnataka"], type: "state" },

  // ==================== TAMIL NADU STATE HOLIDAYS ====================
  { id: "tn_pongal_2025", date: "2025-01-14", name: "Pongal", states: ["Tamil Nadu"], type: "state" },
  { id: "tn_pongal_2026", date: "2026-01-14", name: "Pongal", states: ["Tamil Nadu"], type: "state" },
  { id: "tn_thai_poosam_2025", date: "2025-01-22", name: "Thai Poosam", states: ["Tamil Nadu"], type: "state" },
  { id: "tn_thai_poosam_2026", date: "2026-02-11", name: "Thai Poosam", states: ["Tamil Nadu"], type: "state" },

  // ==================== KERALA STATE HOLIDAYS ====================
  { id: "kerala_vishu_2025", date: "2025-04-14", name: "Vishu", states: ["Kerala"], type: "state" },
  { id: "kerala_vishu_2026", date: "2026-04-14", name: "Vishu", states: ["Kerala"], type: "state" },
  { id: "kerala_thiruvonam_2025", date: "2025-09-18", name: "Thiruvonam (Onam)", states: ["Kerala"], type: "state" },
  { id: "kerala_thiruvonam_2026", date: "2026-09-07", name: "Thiruvonam (Onam)", states: ["Kerala"], type: "state" },

  // ==================== GUJARAT STATE HOLIDAYS ====================
  { id: "gujarat_navratri_2025", date: "2025-10-02", name: "Navratri (Garba)", states: ["Gujarat"], type: "state" },
  { id: "gujarat_navratri_2026", date: "2026-09-21", name: "Navratri (Garba)", states: ["Gujarat"], type: "state" },

  // ==================== RAJASTHAN STATE HOLIDAYS ====================
  { id: "rajasthan_teej_2025", date: "2025-08-05", name: "Teej", states: ["Rajasthan"], type: "state" },
  { id: "rajasthan_teej_2026", date: "2026-07-25", name: "Teej", states: ["Rajasthan"], type: "state" },

  // ==================== UTTAR PRADESH STATE HOLIDAYS ====================
  { id: "up_ram_navami_2025", date: "2025-03-29", name: "Ram Navami", states: ["Uttar Pradesh"], type: "state" },
  { id: "up_ram_navami_2026", date: "2026-04-14", name: "Ram Navami", states: ["Uttar Pradesh"], type: "state" },

  // ==================== DELHI STATE HOLIDAYS ====================
  { id: "delhi_buddha_purnima_2025", date: "2025-05-05", name: "Buddha Purnima", states: ["Delhi"], type: "state" },
  { id: "delhi_buddha_purnima_2026", date: "2026-04-25", name: "Buddha Purnima", states: ["Delhi"], type: "state" },

  // ==================== WEST BENGAL STATE HOLIDAYS ====================
  { id: "wb_rabindra_jayanti_2025", date: "2025-05-09", name: "Rabindra Jayanti", states: ["West Bengal"], type: "state" },
  { id: "wb_rabindra_jayanti_2026", date: "2026-05-09", name: "Rabindra Jayanti", states: ["West Bengal"], type: "state" },

  // ==================== PUNJAB STATE HOLIDAYS ====================
  { id: "punjab_vaisakhi_2025", date: "2025-04-13", name: "Vaisakhi", states: ["Punjab"], type: "state" },
  { id: "punjab_vaisakhi_2026", date: "2026-04-13", name: "Vaisakhi", states: ["Punjab"], type: "state" },

  // ==================== MADHYA PRADESH STATE HOLIDAYS ====================
  { id: "mp_amarkantakuni_2025", date: "2025-11-03", name: "Amarkantakuni", states: ["Madhya Pradesh"], type: "state" },
  { id: "mp_amarkantakuni_2026", date: "2026-11-03", name: "Amarkantakuni", states: ["Madhya Pradesh"], type: "state" },

  // ==================== BIHAR STATE HOLIDAYS ====================
  { id: "bihar_buddha_purnima_2025", date: "2025-05-05", name: "Buddha Purnima", states: ["Bihar"], type: "state" },
  { id: "bihar_buddha_purnima_2026", date: "2026-04-25", name: "Buddha Purnima", states: ["Bihar"], type: "state" },
];
