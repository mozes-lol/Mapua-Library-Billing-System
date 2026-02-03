package com.mapua.library.models;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "service_type")
public class ServiceType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "service_id")
    private Integer serviceId;

    @Column(name = "serviceName", nullable = false, length = 200)
    private String serviceName;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "unitPrice", precision = 18, scale = 2)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    public ServiceType() { }

    public ServiceType(String serviceName, BigDecimal unitPrice) {
        this.serviceName = serviceName;
        this.unitPrice = unitPrice;
    }

    public Integer getServiceId() {
        return serviceId;
    }

    public void setServiceId(Integer serviceId) {
        this.serviceId = serviceId;
    }

    public String getServiceName() {
        return serviceName;
    }

    public void setServiceName(String serviceName) {
        this.serviceName = serviceName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    @Override
    public String toString() {
        return "ServiceType{" +
                "serviceId=" + serviceId +
                ", serviceName='" + serviceName + '\'' +
                ", unitPrice=" + unitPrice +
                '}';
    }
}
