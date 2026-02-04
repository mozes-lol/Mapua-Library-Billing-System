package com.mapua.library;

import com.mapua.library.models.User;
import com.mapua.library.util.HibernateUtil;
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextField;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.mindrot.jbcrypt.BCrypt;

public class MainApp extends Application {
    
    private SessionFactory sessionFactory;
    private Label statusLabel;
    private Stage primaryStage;
    private User currentUser;
    
    public static void main(String[] args) {
        launch(args);
    }
    
    @Override
    public void start(Stage primaryStage) {
        this.primaryStage = primaryStage;
        showLoginScreen();
    }
    
    private void showLoginScreen() {
        primaryStage.setTitle("Mapua Library Billing System - Login");
      
        Label emailLabel = new Label("Email:");
        TextField emailField = new TextField();
        
        Label passwordLabel = new Label("Password:");
        PasswordField passwordField = new PasswordField();
        
        statusLabel = new Label("");
        
        Button loginButton = new Button("Login");
        loginButton.setOnAction(e -> {
            String email = emailField.getText();
            String password = passwordField.getText();
            
            if (email.isEmpty() || password.isEmpty()) {
                statusLabel.setText("Please enter email and password");
                return;
            }
            
            statusLabel.setText("Logging in...");
            login(email, password);
        });
        
        VBox root = new VBox(10);
        root.getChildren().addAll(emailLabel, emailField, passwordLabel, passwordField, loginButton, statusLabel);
        
        Scene scene = new Scene(root, 300, 250);
        primaryStage.setScene(scene);
        primaryStage.show();
    }
    
    private void showDashboard() {
        primaryStage.setTitle("Mapua Library Billing System - Dashboard");
        
        Label welcomeLabel = new Label("Welcome, " + currentUser.getGivenName() + " " + currentUser.getLastName());
        Label roleLabel = new Label("Role: " + currentUser.getRole());
        Label emailLabel = new Label("Email: " + currentUser.getEmailAddress());
        
        Button logoutButton = new Button("Logout");
        logoutButton.setOnAction(e -> logout());
        
        VBox root = new VBox(10);
        root.getChildren().addAll(welcomeLabel, roleLabel, emailLabel, logoutButton);
        
        Scene scene = new Scene(root, 400, 200);
        primaryStage.setScene(scene);
    }
    
    private void logout() {
        currentUser = null;
        showLoginScreen();
    }
    
    private void login(String email, String password) {
        new Thread(() -> {
            try {
                sessionFactory = HibernateUtil.getSessionFactory();
                Session session = sessionFactory.openSession();
                
                User user = session.createQuery("FROM User WHERE emailAddress = :email", User.class)
                        .setParameter("email", email)
                        .uniqueResult();
                
                session.close();
                
                if (user == null) {
                    javafx.application.Platform.runLater(() -> {
                        statusLabel.setText("User not found");
                    });
                    return;
                }
                
                if (user.getPassword() != null && BCrypt.checkpw(password, user.getPassword())) {
                    currentUser = user;
                    javafx.application.Platform.runLater(() -> {
                        showDashboard();
                    });
                } else {
                    javafx.application.Platform.runLater(() -> {
                        statusLabel.setText("Invalid password");
                    });
                }
                
            } catch (Exception e) {
                javafx.application.Platform.runLater(() -> {
                    statusLabel.setText("Error: " + e.getMessage());
                });
                e.printStackTrace();
            }
        }).start();
    }
    
    @Override
    public void stop() {
        
        if (sessionFactory != null) {
            HibernateUtil.shutdown();
        }
    }
}
