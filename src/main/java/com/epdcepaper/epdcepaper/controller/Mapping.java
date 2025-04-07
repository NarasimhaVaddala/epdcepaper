package com.epdcepaper.epdcepaper.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import com.epdcepaper.epdcepaper.entity.Epaper;
import com.epdcepaper.epdcepaper.service.EpaperService;



@Controller
public class Mapping {
	@Autowired
    private EpaperService epaperService;
	
	@GetMapping("/")
    public String showHomePage(Model model) {
            // Fetch the latest Epaper data

            Epaper epaper = epaperService.getLatestContent();
           
            if (epaper == null) {
                System.out.println("Epaper is null");
            } else {
                System.out.println("ytrtyuiiuy......."+epaper);
            }
            // Construct full URLs for images and PDFs 
            if (epaper != null) {
                // String imageBaseUrl = "http://192.168.1.126:17012/uploads/";
                // String pdfBaseUrl = "http://192.168.1.126:17012/uploads/";

                String imageBaseUrl = "https://admin.epdcindia.com/uploads/";
                String pdfBaseUrl = "https://admin.epdcindia.com/uploads/";
    
    
                epaper.setEdition1Image(constructFileUrl(epaper.getEdition1Image(), imageBaseUrl));
                epaper.setEdition1PdfFile(constructFileUrl(epaper.getEdition1PdfFile(), pdfBaseUrl));
                epaper.setEdition2Image(constructFileUrl(epaper.getEdition2Image(), imageBaseUrl));
                epaper.setEdition2PdfFile(constructFileUrl(epaper.getEdition2PdfFile(), pdfBaseUrl));
                epaper.setAdvertisementImage(constructFileUrl(epaper.getAdvertisementImage(), imageBaseUrl));
            }
    
            // Add the Epaper object to the model
            model.addAttribute("epaper", epaper);
        return "epaper";
    }
    
    
    private String constructFileUrl(String filePath, String baseUrl) {
        if (filePath == null || filePath.isEmpty()) {
            return ""; // Return an empty string or a default URL
        }
        return baseUrl + filePath.replace("\\", "/");
    }

}
