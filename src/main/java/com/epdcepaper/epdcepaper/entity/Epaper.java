package com.epdcepaper.epdcepaper.entity;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

@Document(collection = "epaper")
public class Epaper {

    @Id
    private String id;
    private Date date;

    public Date getDate() {
        return date;
    }

    public void setDate(Date date) {
        this.date = date;
    }

    private String edition1Image;
    private String edition1Title;
    private String edition1PdfFile;

    private String edition2Image;
    private String edition2Title;
    private String edition2PdfFile;

    public String getEdition1PdfFile() {
        return edition1PdfFile;
    }

    public void setEdition1PdfFile(String edition1PdfFile) {
        this.edition1PdfFile = edition1PdfFile;
    }

    public String getEdition2PdfFile() {
        return edition2PdfFile;
    }

    public void setEdition2PdfFile(String edition2PdfFile) {
        this.edition2PdfFile = edition2PdfFile;
    }

    private String advertisementImage;
    private String advertisementLink;

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEdition1Image() {
        return edition1Image;
    }

    public void setEdition1Image(String edition1Image) {
        this.edition1Image = edition1Image;
    }

    public String getEdition1Title() {
        return edition1Title;
    }

    public void setEdition1Title(String edition1Title) {
        this.edition1Title = edition1Title;
    }

   
    public String getEdition2Image() {
        return edition2Image;
    }

    public void setEdition2Image(String edition2Image) {
        this.edition2Image = edition2Image;
    }

    public String getEdition2Title() {
        return edition2Title;
    }

    public void setEdition2Title(String edition2Title) {
        this.edition2Title = edition2Title;
    }


    public String getAdvertisementImage() {
        return advertisementImage;
    }

    public void setAdvertisementImage(String advertisementImage) {
        this.advertisementImage = advertisementImage;
    }

    public String getAdvertisementLink() {
        return advertisementLink;
    }

    public void setAdvertisementLink(String advertisementLink) {
        this.advertisementLink = advertisementLink;
    }

}
