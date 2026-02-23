package com.stock.qualityservice.entity;

public enum Disposition {
    ACCEPT,              // Full acceptance
    REJECT,              // Full rejection
    REWORK,              // Send for rework
    SCRAP,               // Dispose/scrap
    CONDITIONAL_ACCEPT,  // Accept with conditions
    RETURN_TO_SUPPLIER,  // Return to vendor
    QUARANTINE,  
    UNDER_REVIEW         // Pending decision
}