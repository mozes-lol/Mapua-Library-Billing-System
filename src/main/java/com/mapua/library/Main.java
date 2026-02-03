package com.mapua.library;

import com.mapua.library.util.HibernateUtil;
import org.hibernate.Session;
import org.hibernate.SessionFactory;

public class Main {
    
    public static void main(String[] args) {
        SessionFactory sessionFactory = null;
        
        try {
            System.out.println("Connecting to Supabase...");
            System.out.println("Project URL: https://sceonqnherqcapicgzxb.supabase.co");
            
            sessionFactory = HibernateUtil.getSessionFactory();
            Session session = sessionFactory.openSession();
            
          
            session.createNativeQuery("SELECT 1").getSingleResult();
            
          
            Long userCount = session.createQuery("SELECT COUNT(*) FROM User", Long.class).getSingleResult();
            Long transactionCount = session.createQuery("SELECT COUNT(*) FROM Transaction", Long.class).getSingleResult();
            Long transactionDetailCount = session.createQuery("SELECT COUNT(*) FROM TransactionDetail", Long.class).getSingleResult();
            Long serviceTypeCount = session.createQuery("SELECT COUNT(*) FROM ServiceType", Long.class).getSingleResult();
            Long auditLogCount = session.createQuery("SELECT COUNT(*) FROM AuditLog", Long.class).getSingleResult();
            
            session.close();
            
            System.out.println("Database: Successfully connected\n");
            System.out.println("Tables Created:");
            System.out.println("Users: " + userCount);
            System.out.println("Transactions: " + transactionCount);
            System.out.println("Transaction Details: " + transactionDetailCount);
            System.out.println("Service Types: " + serviceTypeCount);
            System.out.println("Audit Logs: " + auditLogCount);
          
            
        } catch (Exception e) {
            String errorMessage = e.getMessage();
            
            System.err.println("\n Connection Error!");
            
            // Check if it's a password error
            if (errorMessage != null && errorMessage.contains("password")) {
                System.err.println("Authentication failed!");
                System.err.println("\nPlease check your database password in:");
                System.err.println("src/main/resources/application.conf");
                System.err.println("\nTo get your password:");
                System.err.println("1. Go to Supabase Dashboard");
                System.err.println("2. Settings → Database");
                System.err.println("3. Find your database password");
            } else {
                System.err.println("Error connecting to database:");
                System.err.println("\nPlease check:");
                System.err.println("1. Your password in application.conf");
                System.err.println("2. Your Supabase project is active (not paused)");
                System.err.println("3. Your internet connection");
            }
            
            System.err.println("\nError details: " + errorMessage);
            e.printStackTrace();
        } finally {
            if (sessionFactory != null) {
                HibernateUtil.shutdown();
            }
        }
    }
}
