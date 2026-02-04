package com.mapua.library.util;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.hibernate.cfg.Environment;

public class HibernateUtil {
    
    private static SessionFactory sessionFactory;
    
    public static SessionFactory getSessionFactory() {
        if (sessionFactory == null) {
            try {
                Config config = ConfigFactory.load("application.conf");
                Config dbConfig = config.getConfig("database");
                
                Configuration hibernateConfig = new Configuration();
                

                hibernateConfig.setProperty(Environment.DRIVER, "org.postgresql.Driver");
                hibernateConfig.setProperty(Environment.URL, dbConfig.getString("url"));
                hibernateConfig.setProperty(Environment.USER, dbConfig.getString("username"));
                hibernateConfig.setProperty(Environment.PASS, dbConfig.getString("password"));
                

                Config poolConfig = dbConfig.getConfig("pool");
                hibernateConfig.setProperty(Environment.C3P0_MAX_SIZE, String.valueOf(poolConfig.getInt("maximumPoolSize")));
                hibernateConfig.setProperty(Environment.C3P0_MIN_SIZE, String.valueOf(poolConfig.getInt("minimumIdle")));
                hibernateConfig.setProperty(Environment.C3P0_TIMEOUT, String.valueOf(poolConfig.getInt("connectionTimeout")));
                

                Config hibernateSettings = dbConfig.getConfig("hibernate");
                hibernateConfig.setProperty(Environment.DIALECT, hibernateSettings.getString("dialect"));
                hibernateConfig.setProperty(Environment.HBM2DDL_AUTO, hibernateSettings.getString("hbm2ddl.auto"));
                hibernateConfig.setProperty(Environment.SHOW_SQL, String.valueOf(hibernateSettings.getBoolean("show_sql")));
                hibernateConfig.setProperty(Environment.FORMAT_SQL, String.valueOf(hibernateSettings.getBoolean("format_sql")));


                hibernateConfig.addAnnotatedClass(com.mapua.library.models.User.class);
                hibernateConfig.addAnnotatedClass(com.mapua.library.models.Transaction.class);
                hibernateConfig.addAnnotatedClass(com.mapua.library.models.TransactionDetail.class);
                hibernateConfig.addAnnotatedClass(com.mapua.library.models.ServiceType.class);
                hibernateConfig.addAnnotatedClass(com.mapua.library.models.AuditLog.class);
                
                sessionFactory = hibernateConfig.buildSessionFactory();
                
            } catch (Exception e) {
                System.err.println("Error creating SessionFactory: " + e.getMessage());
                e.printStackTrace();
                throw new RuntimeException("Failed to initialize database connection", e);
            }
        }
        return sessionFactory;
    }
    
    public static void shutdown() {
        if (sessionFactory != null) {
            sessionFactory.close();
        }
    }
}
