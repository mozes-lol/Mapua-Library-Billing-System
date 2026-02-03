package com.mapua.library.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "transactions")
public class Transaction {
    
    @Id
    @Column(name = "transaction_id", nullable = false, length = 50)
    private String transactionId;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "processed_by", nullable = false)
    private User processedBy;
    
    @Column(name = "date_time", nullable = false)
    private LocalDateTime dateTime;
   
    @Column(name = "term", length = 20)
    private String term;
    
    @Column(name = "school_year", length = 20)
    private String schoolYear;
    
    @OneToMany(mappedBy = "transaction", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<TransactionDetail> transactionDetails = new ArrayList<>();
    
    
    public Transaction() {
        this.dateTime = LocalDateTime.now();
        this.transactionId = generateTransactionId();
    }
    
    public Transaction(User user, User processedBy) {
        this();
        this.user = user;
        this.processedBy = processedBy;
    }
    
    private String generateTransactionId() {
        return "TXN-" + System.currentTimeMillis();
    }
    
  
    public String getTransactionId() {
        return transactionId;
    }
    
    public void setTransactionId(String transactionId) {
        this.transactionId = transactionId;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public User getProcessedBy() {
        return processedBy;
    }
    
    public void setProcessedBy(User processedBy) {
        this.processedBy = processedBy;
    }
    
    public LocalDateTime getDateTime() {
        return dateTime;
    }
    
    public void setDateTime(LocalDateTime dateTime) {
        this.dateTime = dateTime;
    }
    
    public String getTerm() {
        return term;
    }
    
    public void setTerm(String term) {
        this.term = term;
    }
    
    public String getSchoolYear() {
        return schoolYear;
    }
    
    public void setSchoolYear(String schoolYear) {
        this.schoolYear = schoolYear;
    }
    
    public List<TransactionDetail> getTransactionDetails() {
        return transactionDetails;
    }
    
    public void setTransactionDetails(List<TransactionDetail> transactionDetails) {
        this.transactionDetails = transactionDetails;
    }
    
    @Override
    public String toString() {
        return "Transaction{" +
                "transactionId='" + transactionId + '\'' +
                ", user=" + (user != null ? user.getUserId() : "null") +
                ", processedBy=" + (processedBy != null ? processedBy.getUserId() : "null") +
                ", dateTime=" + dateTime +
                ", term='" + term + '\'' +
                ", schoolYear='" + schoolYear + '\'' +
                '}';
    }
}
