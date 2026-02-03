package com.mapua.library.models;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "transaction_detail")
public class TransactionDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "detail_id")
    private Integer detailId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "transaction_id", nullable = false)
    private Transaction transaction;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "service_id", nullable = false)  
    private ServiceType serviceType;

    @Column(name = "quantity")
    private Integer quantity = 1;

    @Column(name = "subtotal", precision = 18, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

  
    public TransactionDetail() {
    }

    public TransactionDetail(Transaction transaction, ServiceType serviceType) {
        this.transaction = transaction;
        this.serviceType = serviceType;
        calculateSubtotal();
    }

    
    public Integer getDetailId() {
        return detailId;
    }

    public void setDetailId(Integer detailId) {
        this.detailId = detailId;
    }

    public Transaction getTransaction() {
        return transaction;
    }

    public void setTransaction(Transaction transaction) {
        this.transaction = transaction;
    }

    public ServiceType getServiceType() {
        return serviceType;
    }

    public void setServiceType(ServiceType serviceType) {
        this.serviceType = serviceType;
        calculateSubtotal();
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
        calculateSubtotal();
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }

    // Calculate subtotal from service price and quantity
    public void calculateSubtotal() {
        if (quantity != null && serviceType != null && serviceType.getUnitPrice() != null) {
            this.subtotal = serviceType.getUnitPrice().multiply(new BigDecimal(quantity));
        }
    }

    @Override
    public String toString() {
        return "TransactionDetail{" +
                "detailId=" + detailId +
                ", serviceType=" + (serviceType != null ? serviceType.getServiceName() : "null") +
                ", quantity=" + quantity +
                ", subtotal=" + subtotal +
                '}';
    }
}
