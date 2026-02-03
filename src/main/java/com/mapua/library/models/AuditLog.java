package com.mapua.library.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_log")
public class AuditLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "audit_id")
    private Integer auditId;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(name = "action_taken", nullable = false, length = 50)
    private String actionTaken;
    
    @Column(name = "log_timestamp", nullable = false)
    private LocalDateTime logTimestamp;
    

    public AuditLog() {
        this.logTimestamp = LocalDateTime.now();
    }
    
    public AuditLog(User user, String actionTaken) {
        this();
        this.user = user;
        this.actionTaken = actionTaken;
    }
    
   
    public Integer getAuditId() {
        return auditId;
    }
    
    public void setAuditId(Integer auditId) {
        this.auditId = auditId;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public String getActionTaken() {
        return actionTaken;
    }
    
    public void setActionTaken(String actionTaken) {
        this.actionTaken = actionTaken;
    }
    
    public LocalDateTime getLogTimestamp() {
        return logTimestamp;
    }
    
    public void setLogTimestamp(LocalDateTime logTimestamp) {
        this.logTimestamp = logTimestamp;
    }
    
    @Override
    public String toString() {
        return "AuditLog{" +
                "auditId=" + auditId +
                ", user=" + (user != null ? user.getUserId() : "null") +
                ", actionTaken='" + actionTaken + '\'' +
                ", logTimestamp=" + logTimestamp +
                '}';
    }
}
